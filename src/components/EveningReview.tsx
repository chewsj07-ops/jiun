import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Heart, Lock, Moon, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Scripture } from '../constants';
import { DailyPractice, DailyPracticeItem } from '../types/practice';
import { isSamePracticeDay, practiceService } from '../services/practiceService';
import { ritualService } from '../services/ritualService';
import {
  EveningReviewDraft,
  TodayIntentionCheck,
  buildEveningSummary,
  clearEveningReviewDraft,
  loadEveningReviewDraft,
  saveEveningReviewDraft,
} from '../services/eveningReviewService';
import { formatSpecialDedicationLine } from '../data/ritual';
import { containsCrisisKeywords } from '../data/offlineGuidance';
import { cryptoService } from '../services/cryptoService';
import { identityService } from '../services/identityService';
import { consentService } from '../services/consentService';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { playCompletionBell } from '../utils/zenAudio';
import { safeStorage } from '../utils/safeStorage';
import { SafetyNetCard } from './vow/SafetyNetCard';
import { MindConsentSheet } from './ConsentModals';
import { ALL_EMOTIONS } from './ThoughtCollector';
import { cn } from '../lib/utils';

interface QuickThoughtPreview {
  id: number;
  emotions: string[];
  event: string;
  timestamp: string;
  reviewedInEvening?: boolean;
  mode?: 'quick' | 'full';
  hasGuidance?: boolean;
}

const TOTAL_STEPS = 6;

const INTENTION_CHECK_OPTIONS: { id: Exclude<TodayIntentionCheck, null>; label: string }[] = [
  { id: 'done', label: '做到了' },
  { id: 'partial', label: '做到一些' },
  { id: 'not_yet', label: '还没有' },
];

const TOMORROW_SUGGESTIONS = [
  '对家人多一分耐心',
  '说话前先停顿三秒',
  '把善意留给身边人',
];

const REPENTANCE_VERSE =
  '往昔所造诸恶业，皆由无始贪瞋痴，从身语意之所生，一切我今皆忏悔。';

interface EveningReviewProps {
  isOpen: boolean;
  allScriptures: Scripture[];
  dailyPractice: DailyPractice;
  dailyPracticeList: DailyPracticeItem[];
  history: any[];
  personalVow: string;
  dedicationText: string;
  volume: number;
  onMeditate?: () => void;
  onRecordEvening: (item: any) => void;
  onClose: () => void;
}

export const EveningReview: React.FC<EveningReviewProps> = ({
  isOpen,
  allScriptures,
  dailyPractice,
  dailyPracticeList,
  history,
  personalVow,
  dedicationText,
  volume,
  onMeditate,
  onRecordEvening,
  onClose,
}) => {
  const [draft, setDraft] = useState<EveningReviewDraft>(() =>
    loadEveningReviewDraft()
  );
  const [showMindConsent, setShowMindConsent] = useState(false);
  const [pendingNextAfterConsent, setPendingNextAfterConsent] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());

  const [todayQuickThoughts, setTodayQuickThoughts] = useState<QuickThoughtPreview[]>([]);
  const [thoughtsVersion, setThoughtsVersion] = useState(0);

  // Re-load draft when opened
  useEffect(() => {
    if (!isOpen) return;
    sessionStartRef.current = Date.now();
    setDraft(loadEveningReviewDraft());
  }, [isOpen]);

  // Auto-save draft on changes while open
  useEffect(() => {
    if (!isOpen) return;
    saveEveningReviewDraft(draft);
  }, [isOpen, draft]);

  // Listen for ThoughtCollector updates (e.g., completing a quick thought into 5 steps)
  useEffect(() => {
    if (!isOpen) return;
    const handleThoughtsUpdated = () => setThoughtsVersion((v) => v + 1);
    window.addEventListener('zen_thoughts_updated', handleThoughtsUpdated);
    return () =>
      window.removeEventListener('zen_thoughts_updated', handleThoughtsUpdated);
  }, [isOpen]);

  // Load & decrypt today's daytime quick thoughts (using 04:00 AM practice-day window)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadQuickThoughts = async () => {
      const now = new Date();
      const raw = safeStorage.getJSON<any[]>('zen_thoughts', []);
      const todayItems = (Array.isArray(raw) ? raw : []).filter((item: any) =>
        isSamePracticeDay(item.timestamp || item.id, now)
      );

      const quickOrReviewed = todayItems.filter(
        (item: any) => item.mode === 'quick' || item.reviewedInEvening
      );

      const hydrated = await Promise.all(
        quickOrReviewed.map(async (t: any): Promise<QuickThoughtPreview | null> => {
          let event = t.event || '';
          if (t.isEncrypted && t.iv && t.content_encrypted) {
            try {
              const dec = await cryptoService.decrypt(t.content_encrypted, t.iv);
              const parsed = JSON.parse(dec);
              event = parsed?.event || '';
            } catch {
              event = '';
            }
          }
          return {
            id: Number(t.id),
            emotions: Array.isArray(t.emotions) ? t.emotions : [],
            event,
            timestamp: t.timestamp || new Date(t.id).toISOString(),
            reviewedInEvening: Boolean(t.reviewedInEvening),
            mode: t.mode,
            hasGuidance: Boolean(t.guidance),
          };
        })
      );

      if (!cancelled) {
        setTodayQuickThoughts(
          hydrated.filter((item): item is QuickThoughtPreview => item !== null)
        );
      }
    };
    loadQuickThoughts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, thoughtsVersion]);

  const { todayDeedsCount, todayThoughtsCount } = useMemo(() => {
    const now = new Date();
    const savedThoughts = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const tCount = savedThoughts.filter((item: any) =>
      isSamePracticeDay(item.timestamp || item.id, now)
    ).length;

    const savedDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
    const dCount = savedDeeds.filter((d: any) => {
      const isToday = isSamePracticeDay(d.date || d.timestamp, now);
      const isChanting =
        d.content && (d.content.includes('念诵') || d.content.includes('禅修'));
      return isToday && !isChanting;
    }).length;

    return { todayDeedsCount: dCount, todayThoughtsCount: tCount };
  }, [isOpen, draft.stepIndex, thoughtsVersion]);

  const summary = useMemo(() => {
    return buildEveningSummary({
      dailyPractice,
      dailyPracticeList,
      scriptures: allScriptures,
      history,
      todayDeedsCount,
      todayThoughtsCount,
    });
  }, [
    dailyPractice,
    dailyPracticeList,
    allScriptures,
    history,
    todayDeedsCount,
    todayThoughtsCount,
  ]);

  const ritualDaily = useMemo(() => ritualService.getDailyState(), [isOpen]);
  const dedicationTargetLabel = ritualService.resolveDedicationTargetLabel(
    ritualDaily.dedicationTargetType,
    ritualDaily.dedicationCustomName
  );
  const specialDedicationLine = formatSpecialDedicationLine(dedicationTargetLabel);

  const hasCrisisInReflection = useMemo(
    () => containsCrisisKeywords(draft.reflectionText),
    [draft.reflectionText]
  );

  if (!isOpen) return null;

  const updateDraft = (patch: Partial<EveningReviewDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const saveReflectionThought = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || draft.reflectionSaved) return true;

    const isCrisis = containsCrisisKeywords(trimmed);
    const payload = {
      event: `【晚课观照】${trimmed}`,
      action: '睡前回顾当日心念，如实看见。',
      result: '',
      learning: '',
      vow: dailyPractice.todayIntention || personalVow || '',
    };

    const { ciphertext, iv } = await cryptoService.encrypt(
      JSON.stringify(payload)
    );
    const thoughtEntry: any = {
      id: Date.now(),
      uid: identityService.getUserId(),
      type: 'thought_observation',
      record_version: 1,
      emotions: ['peaceful'],
      timestamp: new Date().toISOString(),
      isEncrypted: true,
      content_encrypted: ciphertext,
      iv,
      ...(isCrisis ? { isLocalOnly: true } : {}),
    };

    const existing = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const nextList = [thoughtEntry, ...(Array.isArray(existing) ? existing : [])];
    safeStorage.setJSON('zen_thoughts', nextList);
    practiceService.updateActivity('observing_thoughts', 1);

    if (!isCrisis && auth.currentUser && consentService.hasCloudConsent()) {
      const firestoreDoc = {
        ...thoughtEntry,
        event: '[Encrypted]',
        action: '[Encrypted]',
        result: '[Encrypted]',
        learning: '[Encrypted]',
        vow: '[Encrypted]',
      };
      setDoc(
        doc(db, 'users', auth.currentUser.uid, 'thoughts', String(thoughtEntry.id)),
        firestoreDoc
      ).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('zen_data_updated'));
    window.dispatchEvent(new CustomEvent('zen_thoughts_updated'));
    updateDraft({ reflectionSaved: true });
    return true;
  };

  const saveRepentanceAndRejoiceSideEffects = async () => {
    const confession = draft.confessionText.trim();
    if (confession && !draft.confessionSaved) {
      await ritualService.saveConfessionToThoughts(confession);
      updateDraft({ confessionSaved: true });
    }

    const rejoice = draft.rejoiceText.trim();
    if (rejoice && !draft.rejoiceSaved) {
      practiceService.logRejoice();
      practiceService.updateActivity('rejoicing', 1);
      const existingDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localDate = new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 16);
      const newEntry = {
        id: Date.now().toString(),
        date: localDate,
        type: 'good',
        content: `【晚课随喜】${rejoice}`,
        result: {
          ledger_entry: {
            deed: `【晚课随喜】${rejoice}`,
            liufan_category: '正',
            mindset_applied: '随喜',
          },
          merit_calculation: {
            base: 1,
            multiplier: 1.0,
            total_this_time: 1,
            progress_to_3000: '',
          },
          fate_insight: {
            current_trend: '随喜增慧',
            wisdom_quote: '随喜功德，无量无边。',
            daily_habit_task: '见人行善，心生欢喜',
          },
        },
      };
      safeStorage.setJSON('good_deed_history', [
        newEntry,
        ...(Array.isArray(existingDeeds) ? existingDeeds : []),
      ]);
      window.dispatchEvent(new CustomEvent('zen_data_updated'));
      updateDraft({ rejoiceSaved: true });
    }
  };

  const handleNextFromStep = async () => {
    const idx = draft.stepIndex;

    // Step 3 (index 2): 观照一问
    if (idx === 2 && draft.reflectionText.trim() && !draft.reflectionSaved) {
      if (!consentService.hasMindConsent()) {
        setPendingNextAfterConsent(true);
        setShowMindConsent(true);
        return;
      }
      await saveReflectionThought(draft.reflectionText);
    }

    // Step 4 (index 3): 忏悔与随喜
    if (idx === 3) {
      await saveRepentanceAndRejoiceSideEffects();
    }

    // Step 6 (index 5): 明日一愿
    if (idx === 5) {
      practiceService.saveTomorrowIntention(draft.tomorrowIntention);
      updateDraft({ isCompleteScreen: true });
      return;
    }

    updateDraft({ stepIndex: Math.min(TOTAL_STEPS - 1, idx + 1) });
  };

  const handleDedicateConfirm = () => {
    playCompletionBell(volume <= 0 ? 0 : Math.max(0.55, volume));
    practiceService.updateActivity('full_dedication', true);
    practiceService.updateActivity('evening_class', true);
    updateDraft({
      dedicationDone: true,
      stepIndex: 5,
    });
  };

  const handlePrev = () => {
    if (draft.isCompleteScreen) {
      updateDraft({ isCompleteScreen: false, stepIndex: TOTAL_STEPS - 1 });
      return;
    }
    if (draft.stepIndex === 0) {
      onClose();
      return;
    }
    updateDraft({ stepIndex: Math.max(0, draft.stepIndex - 1) });
  };

  const handleRecordAndClose = () => {
    practiceService.saveTomorrowIntention(draft.tomorrowIntention);
    if (!draft.dedicationDone) {
      practiceService.updateActivity('full_dedication', true);
      practiceService.updateActivity('evening_class', true);
    }
    const endTime = Date.now();
    const duration = Math.max(
      60,
      Math.round((endTime - sessionStartRef.current) / 1000)
    );
    const fullDedication = specialDedicationLine
      ? `${dedicationText}\n${specialDedicationLine}`
      : dedicationText;

    onRecordEvening({
      id: endTime,
      chant: '晚课 · 回向复盘',
      count: 1,
      startTime: sessionStartRef.current,
      endTime,
      duration,
      dedication: fullDedication,
      vow:
        draft.tomorrowIntention.trim() ||
        dailyPractice.todayIntention ||
        personalVow ||
        '',
      type: 'evening',
      source: '晚课',
    });

    clearEveningReviewDraft();
    toast.success('晚课已记入愿簿');
    onClose();
  };

  const todayIntention = (dailyPractice.todayIntention || '').trim();

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-full bg-paper flex flex-col justify-between overflow-hidden select-none">
      {/* Subtle calming backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-65"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, var(--theme-accent-mist) 0%, transparent 70%)',
        }}
      />

      {/* Top Navigation */}
      <header className="relative z-20 h-14 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          aria-label={draft.stepIndex === 0 && !draft.isCompleteScreen ? '离开' : '上一步'}
          className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        {/* Progress Dots */}
        <div
          className="flex items-center justify-center gap-1.5"
          aria-label={
            draft.isCompleteScreen
              ? '晚课圆满'
              : `第 ${draft.stepIndex + 1} 步，共 ${TOTAL_STEPS} 步`
          }
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
            const isCurrent = !draft.isCompleteScreen && idx === draft.stepIndex;
            const isPassed = draft.isCompleteScreen || idx < draft.stepIndex;
            return (
              <span
                key={idx}
                className={cn(
                  'rounded-full transition-all duration-300',
                  isCurrent
                    ? 'w-5 h-2 bg-accent'
                    : isPassed
                    ? 'w-2 h-2 bg-accent-soft'
                    : 'w-2 h-2 bg-line-strong'
                )}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3 min-h-[36px] rounded-full text-xs text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors whitespace-nowrap flex items-center gap-1"
        >
          <X size={14} strokeWidth={1.5} />
          <span>暂离</span>
        </button>
      </header>

      {/* Main Step Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {draft.isCompleteScreen ? (
            <motion.div
              key="evening-complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md text-center space-y-6 my-auto"
            >
              <div className="w-16 h-16 rounded-full bg-accent-mist text-accent flex items-center justify-center mx-auto">
                <Moon className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-display text-ink">今日功课圆满，愿你安眠。</h2>
                {draft.tomorrowIntention.trim() && (
                  <p className="text-caption pt-2">
                    明日一愿已收好：「{draft.tomorrowIntention.trim()}」
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`evening-step-${draft.stepIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md space-y-5 my-auto"
            >
              {/* Step 1: 今日回顾 */}
              {draft.stepIndex === 0 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 回顾</p>
                    <h2 className="text-title text-ink">今日回顾</h2>
                    <p className="text-caption">
                      {new Date().getHours() < 4
                        ? '凌晨未眠，仍可从容补做昨晚的晚课回向'
                        : '轻轻看一眼今天走过的路，不必苛求完美'}
                    </p>
                  </div>

                  {!summary.hasAnyActivity ? (
                    <div className="p-6 rounded-2xl bg-surface border border-line text-center">
                      <p className="font-serif text-base text-ink-2 leading-relaxed">
                        今天还没有记录，也没关系，此刻就是开始。
                      </p>
                    </div>
                  ) : (
                    <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                      {summary.chantingItems.length > 0 && (
                        <div className="p-4 space-y-2">
                          <p className="text-caption font-medium text-ink-2">
                            今日念诵
                          </p>
                          <div className="space-y-1.5">
                            {summary.chantingItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-ink font-serif">
                                  {item.title}
                                </span>
                                <span className="text-accent font-medium tabular-nums">
                                  {item.count} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {summary.meditationMinutes > 0 && (
                        <div className="p-4 flex items-center justify-between text-sm">
                          <span className="text-ink-2">静坐安住</span>
                          <span className="text-ink font-medium tabular-nums">
                            {summary.meditationMinutes} 分钟
                          </span>
                        </div>
                      )}

                      {summary.goodDeedsCount > 0 && (
                        <div className="p-4 flex items-center justify-between text-sm">
                          <span className="text-ink-2">日常行善</span>
                          <span className="text-ink font-medium tabular-nums">
                            {summary.goodDeedsCount} 条
                          </span>
                        </div>
                      )}

                      {summary.thoughtsCount > 0 && (
                        <div className="p-4 flex items-center justify-between text-sm">
                          <span className="text-ink-2">觉察观心</span>
                          <span className="text-ink font-medium tabular-nums">
                            {summary.thoughtsCount} 条
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: 今日一念 */}
              {draft.stepIndex === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 检视初心</p>
                    <h2 className="text-title text-ink">今天的这一念，做到了吗？</h2>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface border border-line text-center space-y-1.5">
                    <p className="text-caption">
                      {todayIntention
                        ? '今日一念'
                        : personalVow.trim()
                        ? '长期愿力'
                        : '今日初心'}
                    </p>
                    <p className="font-serif text-lg text-ink leading-relaxed break-words">
                      {todayIntention ||
                        personalVow.trim() ||
                        '今天未写一念，也可以温和回想此刻对自己的期许'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {INTENTION_CHECK_OPTIONS.map((opt) => {
                      const active = draft.intentionCheck === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateDraft({ intentionCheck: opt.id })}
                          className={cn(
                            'w-full min-h-[52px] px-5 rounded-2xl border text-sm font-medium transition-colors flex items-center justify-between',
                            active
                              ? 'bg-accent-mist text-accent border-accent'
                              : 'bg-surface text-ink border-line hover:border-line-strong'
                          )}
                        >
                          <span>{opt.label}</span>
                          {active && (
                            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: 观照一问 */}
              {draft.stepIndex === 2 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 观照一问</p>
                    <h2 className="text-title text-ink">
                      {todayQuickThoughts.length > 0
                        ? '这一念，现在回头看，看见了什么？'
                        : '今天哪一个念头，最值得被看见？'}
                    </h2>
                    <p className="text-caption flex items-center justify-center gap-1">
                      <Lock size={12} strokeWidth={1.5} className="text-accent" />
                      <span>填写后将加密保存至观心记录（可跳过）</span>
                    </p>
                  </div>

                  {todayQuickThoughts.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-medium text-ink-2">
                        白天速记的一念（点击可回头写下看见，或补全五步转念）：
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {todayQuickThoughts.map((qt) => {
                          const emoLabels =
                            qt.emotions
                              .map(
                                (id) =>
                                  ALL_EMOTIONS.find((e) => e.id === id)?.label || id
                              )
                              .join('、') || '念头';
                          const timeStr = new Date(qt.timestamp).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          );
                          const isCompletedFull =
                            qt.mode === 'full' || qt.reviewedInEvening || qt.hasGuidance;

                          return (
                            <div
                              key={qt.id}
                              className="p-3.5 rounded-2xl bg-surface border border-line space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                                <span className="text-accent font-medium">
                                  {emoLabels}
                                </span>
                                <span>
                                  {timeStr}
                                  {isCompletedFull ? ' · 已完成转念' : ' · 白天速记'}
                                </span>
                              </div>
                              {qt.event && (
                                <p className="text-sm text-ink leading-relaxed break-words select-text">
                                  {qt.event}
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const snippet = (qt.event || emoLabels).slice(0, 24);
                                    updateDraft({
                                      reflectionText: draft.reflectionText.trim()
                                        ? `${draft.reflectionText}\n回看「${snippet}」：`
                                        : `回看「${snippet}」：`,
                                    });
                                  }}
                                  className="min-h-[36px] px-3 rounded-full bg-surface-2 border border-line text-xs text-ink-2 hover:text-ink transition-colors"
                                >
                                  回看这一念
                                </button>
                                {!isCompletedFull && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.dispatchEvent(
                                        new CustomEvent('open-thought-collector', {
                                          detail: {
                                            mode: 'full',
                                            editThoughtId: qt.id,
                                          },
                                        })
                                      )
                                    }
                                    className="min-h-[36px] px-3 rounded-full bg-accent-mist text-accent hover:bg-accent hover:text-on-accent text-xs font-medium transition-colors"
                                  >
                                    补全五步与转念
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={draft.reflectionText}
                    onChange={(e) =>
                      updateDraft({ reflectionText: e.target.value })
                    }
                    placeholder={
                      todayQuickThoughts.length > 0
                        ? '这一念，现在回头看，看见了什么？（可直接写下，或点上方补全五步）'
                        : '例如：下午被同事打断时起了烦躁，停下来深呼吸后慢慢平静下来...'
                    }
                    rows={todayQuickThoughts.length > 0 ? 4 : 5}
                    className="w-full p-4 rounded-2xl bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none leading-relaxed select-text"
                  />

                  {hasCrisisInReflection && (
                    <SafetyNetCard
                      onMeditate={() => {
                        onClose();
                        onMeditate?.();
                      }}
                    />
                  )}
                </div>
              )}

              {/* Step 4: 忏悔与随喜 */}
              {draft.stepIndex === 3 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 忏悔与随喜</p>
                    <h2 className="text-title text-ink">放下愧疚，放大微光</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ink flex items-center justify-between">
                        <span>今天想忏悔的一件事（选填）</span>
                        <span className="text-[11px] text-ink-3">只存本机，不上传</span>
                      </label>
                      <textarea
                        value={draft.confessionText}
                        onChange={(e) =>
                          updateDraft({ confessionText: e.target.value })
                        }
                        placeholder="看见即可放下，忏悔不是自责..."
                        rows={3}
                        className="w-full p-3.5 rounded-2xl bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none select-text"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ink block">
                        今天想随喜的一件事（选填，可以是别人的善行）
                      </label>
                      <textarea
                        value={draft.rejoiceText}
                        onChange={(e) =>
                          updateDraft({ rejoiceText: e.target.value })
                        }
                        placeholder="例如：看见有人在电梯口扶了一把老人；或自己忍住了一次冲动..."
                        rows={3}
                        className="w-full p-3.5 rounded-2xl bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none select-text"
                      />
                    </div>
                  </div>

                  <p className="font-serif text-xs text-ink-2 text-center leading-relaxed px-2 pt-1">
                    {REPENTANCE_VERSE}
                  </p>
                </div>
              )}

              {/* Step 5: 总回向 */}
              {draft.stepIndex === 4 && (
                <div className="space-y-5 text-center">
                  <div className="space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 总回向</p>
                    <h2 className="text-title text-ink">普皆回向</h2>
                  </div>

                  <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
                    <p className="text-title text-ink whitespace-pre-wrap leading-relaxed">
                      {dedicationText}
                    </p>
                    {specialDedicationLine && (
                      <p className="text-sm font-serif text-accent leading-relaxed px-4 py-2.5 rounded-xl bg-accent-mist/70 border border-line">
                        {specialDedicationLine}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: 明日一愿 */}
              {draft.stepIndex === 5 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <p className="text-caption text-accent font-medium">晚课 · 明日一愿</p>
                    <h2 className="text-title text-ink">
                      明天想带着哪一念出发？
                    </h2>
                    <p className="text-caption">明天清晨打开时会自动带入今日一念（可跳过）</p>
                  </div>

                  <textarea
                    value={draft.tomorrowIntention}
                    onChange={(e) =>
                      updateDraft({
                        tomorrowIntention: e.target.value.slice(0, 200),
                      })
                    }
                    placeholder="例如：明天对家人多一分耐心..."
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none select-text"
                  />

                  <div className="flex flex-wrap gap-2 justify-center">
                    {TOMORROW_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateDraft({ tomorrowIntention: s })}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs border transition-colors',
                          draft.tomorrowIntention === s
                            ? 'bg-accent-mist text-accent border-accent font-medium'
                            : 'bg-surface text-ink-2 border-line hover:text-ink'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Primary Action */}
      <footer className="relative z-20 px-5 sm:px-6 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-md w-full mx-auto space-y-2 shrink-0">
        {draft.isCompleteScreen ? (
          <button
            type="button"
            onClick={handleRecordAndClose}
            className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium shadow-float transition-colors"
          >
            记入愿簿
          </button>
        ) : draft.stepIndex === 4 ? (
          <button
            type="button"
            onClick={handleDedicateConfirm}
            className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium shadow-float transition-colors flex items-center justify-center gap-2"
          >
            <Heart size={16} strokeWidth={1.5} />
            <span>至心回向</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextFromStep}
            className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium shadow-float transition-colors flex items-center justify-center gap-2"
          >
            {draft.stepIndex === 5 ? (
              <>
                <Sparkles size={16} strokeWidth={1.5} />
                <span>{draft.tomorrowIntention.trim() ? '收好明日一愿' : '跳过并完成'}</span>
              </>
            ) : draft.stepIndex === 2 && !draft.reflectionText.trim() ? (
              <span>跳过，下一步</span>
            ) : (
              <span>下一步</span>
            )}
          </button>
        )}
      </footer>

      <MindConsentSheet
        isOpen={showMindConsent}
        onConsentAccepted={async () => {
          setShowMindConsent(false);
          if (pendingNextAfterConsent) {
            setPendingNextAfterConsent(false);
            await saveReflectionThought(draft.reflectionText);
            updateDraft({ stepIndex: 3 });
          }
        }}
        onCancel={() => {
          setShowMindConsent(false);
          if (pendingNextAfterConsent) {
            setPendingNextAfterConsent(false);
            updateDraft({ stepIndex: 3 });
          }
        }}
      />
    </div>
  );
};
