import { Scripture } from '../constants';
import { DailyPractice, DailyPracticeItem, MEDITATION_PRACTICE_ID } from '../types/practice';
import {
  getDefaultUnitForCategory,
  getPracticeDateKey,
  isSamePracticeDay,
} from './practiceService';
import { safeStorage } from '../utils/safeStorage';

export interface EveningChantSummaryItem {
  id: string;
  title: string;
  count: number;
  unit: '遍' | '声';
}

export interface EveningSummary {
  chantingItems: EveningChantSummaryItem[];
  meditationMinutes: number;
  goodDeedsCount: number;
  thoughtsCount: number;
  hasAnyActivity: boolean;
}

export type TodayIntentionCheck = 'done' | 'partial' | 'not_yet' | null;

export interface EveningReviewDraft {
  date: string;
  stepIndex: number;
  intentionCheck: TodayIntentionCheck;
  reflectionText: string;
  confessionText: string;
  rejoiceText: string;
  dedicationDone: boolean;
  tomorrowIntention: string;
  isCompleteScreen: boolean;
  reflectionSaved?: boolean;
  confessionSaved?: boolean;
  rejoiceSaved?: boolean;
}

export const STORAGE_KEY_EVENING_DRAFT = 'zen_evening_review_draft';

export function buildEveningSummary(params: {
  dailyPractice: DailyPractice;
  dailyPracticeList?: DailyPracticeItem[];
  scriptures?: Scripture[];
  history?: Array<{
    chant?: string;
    count?: number;
    unit?: '遍' | '声';
    type?: string;
    duration?: number;
    endTime?: number;
    timestamp?: number;
    startTime?: number;
    id?: number | string;
  }>;
  todayDeedsCount?: number;
  todayThoughtsCount?: number;
  now?: Date;
}): EveningSummary {
  const {
    dailyPractice,
    dailyPracticeList = [],
    scriptures = [],
    history = [],
    todayDeedsCount,
    todayThoughtsCount,
    now = new Date(),
  } = params;

  const scriptureById = new Map<string, Scripture>();
  scriptures.forEach((s) => scriptureById.set(s.id, s));

  const unitByScriptureId = new Map<string, '遍' | '声'>();
  dailyPracticeList.forEach((item) => {
    if (item.scriptureId !== MEDITATION_PRACTICE_ID && item.unit) {
      unitByScriptureId.set(item.scriptureId, item.unit);
    }
  });

  const chantingMap = new Map<string, EveningChantSummaryItem>();
  const seenTitles = new Set<string>();

  Object.entries(dailyPractice.scriptureCounts || {}).forEach(
    ([scriptureId, rawCount]) => {
      if (scriptureId === MEDITATION_PRACTICE_ID) return;
      const count = typeof rawCount === 'number' ? rawCount : 0;
      if (count <= 0) return;

      const sc = scriptureById.get(scriptureId);
      const title = sc?.title || scriptureId;
      const unit =
        unitByScriptureId.get(scriptureId) ||
        getDefaultUnitForCategory(sc?.category);

      chantingMap.set(scriptureId, {
        id: scriptureId,
        title,
        count,
        unit,
      });
      seenTitles.add(title);
    }
  );

  // Include any manual/imported chant history items from today that aren't represented in scriptureCounts
  let historyMeditationMinutes = 0;
  for (const rec of history) {
    const ts = rec.endTime || rec.timestamp || rec.startTime || Number(rec.id);
    if (!ts || !isSamePracticeDay(ts, now)) continue;

    if (rec.type === '禅修') {
      const mins =
        typeof rec.duration === 'number' && rec.duration > 0
          ? Math.max(1, Math.round(rec.duration / 60))
          : typeof rec.count === 'number' && rec.count > 0
          ? rec.count
          : 0;
      historyMeditationMinutes += mins;
      continue;
    }

    if (
      (rec.type === '诵经' || rec.type === '持咒') &&
      rec.chant &&
      !seenTitles.has(rec.chant) &&
      typeof rec.count === 'number' &&
      rec.count > 0
    ) {
      const existing = chantingMap.get(`hist-${rec.chant}`);
      const unit =
        rec.unit || (rec.type === '诵经' ? ('遍' as const) : ('声' as const));
      if (existing) {
        existing.count += rec.count;
      } else {
        chantingMap.set(`hist-${rec.chant}`, {
          id: `hist-${rec.chant}`,
          title: rec.chant,
          count: rec.count,
          unit,
        });
      }
    }
  }

  const chantingItems = Array.from(chantingMap.values());
  const meditationMinutes = Math.max(
    dailyPractice.meditation || 0,
    historyMeditationMinutes
  );

  const goodDeedsCount =
    typeof todayDeedsCount === 'number'
      ? Math.max(todayDeedsCount, dailyPractice.good_deeds || 0)
      : dailyPractice.good_deeds || 0;

  const thoughtsCount =
    typeof todayThoughtsCount === 'number'
      ? Math.max(todayThoughtsCount, dailyPractice.observing_thoughts || 0)
      : dailyPractice.observing_thoughts || 0;

  const hasAnyActivity =
    chantingItems.length > 0 ||
    meditationMinutes > 0 ||
    goodDeedsCount > 0 ||
    thoughtsCount > 0;

  return {
    chantingItems,
    meditationMinutes,
    goodDeedsCount,
    thoughtsCount,
    hasAnyActivity,
  };
}

export function loadEveningReviewDraft(now: Date = new Date()): EveningReviewDraft {
  const today = getPracticeDateKey(now);
  const saved = safeStorage.getJSON<EveningReviewDraft | null>(
    STORAGE_KEY_EVENING_DRAFT,
    null
  );
  if (saved && saved.date === today) {
    return saved;
  }
  return {
    date: today,
    stepIndex: 0,
    intentionCheck: null,
    reflectionText: '',
    confessionText: '',
    rejoiceText: '',
    dedicationDone: false,
    tomorrowIntention: '',
    isCompleteScreen: false,
    reflectionSaved: false,
    confessionSaved: false,
    rejoiceSaved: false,
  };
}

export function saveEveningReviewDraft(draft: EveningReviewDraft): void {
  safeStorage.setJSON(STORAGE_KEY_EVENING_DRAFT, draft);
}

export function clearEveningReviewDraft(): void {
  safeStorage.removeItem(STORAGE_KEY_EVENING_DRAFT);
}
