import {
  DailyPractice,
  DailyPracticeItem,
  MEDITATION_PRACTICE_ID,
} from '../types/practice';

export type DailyPathStepId = 'morning' | 'practice' | 'daytime' | 'evening';
export type DailyPathStepStatus = 'done' | 'current' | 'upcoming';

export interface DailyPathStep {
  id: DailyPathStepId;
  shortLabel: string;
  title: string;
  status: DailyPathStepStatus;
  done: boolean;
}

export type DailyPathNextKind =
  | 'morning'
  | 'setup-practice'
  | 'practice-continue'
  | 'practice-start'
  | 'practice-meditation'
  | 'daytime'
  | 'evening'
  | 'all-done';

export interface PendingDaytimeNotice {
  stepId: 'morning' | 'practice' | 'daytime';
  label: string;
}

export interface DailyPathNextAction {
  kind: DailyPathNextKind;
  label: string;
  target:
    | 'ritual'
    | 'daily-practice-settings'
    | 'fish'
    | 'meditation'
    | 'thought-collector'
    | 'evening-review';
  scriptureId?: string;
  meditationMinutes?: number;
  secondaryLink?: {
    label: string;
    target: 'good-deed-collector';
  };
  caption?: string;
  pendingDaytimeNotices?: PendingDaytimeNotice[];
}

export interface DailyPathInput {
  practice: DailyPractice;
  dailyPracticeList: DailyPracticeItem[];
  scriptureTitles?: Record<string, string>;
  ritualCompletedPreRitual?: boolean;
  todayDeedsCount?: number;
  todayThoughtsCount?: number;
}

export interface DailyPathResult {
  steps: DailyPathStep[];
  next: DailyPathNextAction;
  isEveningWindow: boolean;
  practiceProgress: {
    hasConfiguredPractice: boolean;
    totalCount: number;
    completedCount: number;
    estimatedMinutes: number;
  };
}

function isMeditationEntry(item: DailyPracticeItem): boolean {
  return item.kind === 'meditation' || item.scriptureId === MEDITATION_PRACTICE_ID;
}

export function isDailyPracticeItemDone(
  item: DailyPracticeItem,
  practice: DailyPractice
): boolean {
  const celebrated = practice.celebratedScriptures || [];
  if (isMeditationEntry(item)) {
    return celebrated.includes(MEDITATION_PRACTICE_ID);
  }
  const count = (practice.scriptureCounts || {})[item.scriptureId] || 0;
  return celebrated.includes(item.scriptureId) || count >= item.target;
}

export function estimatePracticeMinutes(items: DailyPracticeItem[]): number {
  if (items.length === 0) return 0;
  let totalMinutes = 0;
  for (const item of items) {
    if (isMeditationEntry(item)) {
      totalMinutes += item.minutes || item.target || 15;
    } else if (item.unit === '遍') {
      totalMinutes += Math.max(2, item.target * 2);
    } else {
      totalMinutes += Math.max(1, Math.round(item.target / 45));
    }
  }
  return Math.max(1, Math.round(totalMinutes));
}

export function getDailyPath(
  state: DailyPathInput,
  now: Date = new Date()
): DailyPathResult {
  const {
    practice,
    dailyPracticeList,
    scriptureTitles = {},
    ritualCompletedPreRitual = false,
    todayDeedsCount,
    todayThoughtsCount,
  } = state;

  const hour = now.getHours();
  const isEveningWindow = hour >= 18 || hour < 4;

  const enabledItems = [...(dailyPracticeList || [])]
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);

  const hasConfiguredPractice = enabledItems.length > 0;
  const completedItemsCount = enabledItems.filter((item) =>
    isDailyPracticeItemDone(item, practice)
  ).length;
  const unfinishedItems = enabledItems.filter(
    (item) => !isDailyPracticeItemDone(item, practice)
  );
  const counts = practice.scriptureCounts || {};

  const morningDone =
    Boolean(practice.ritual_done) ||
    Boolean(ritualCompletedPreRitual) ||
    Boolean(practice.todayIntention && practice.todayIntention.trim().length > 0);

  const practiceDone = hasConfiguredPractice && unfinishedItems.length === 0;

  const effectiveDeeds =
    typeof todayDeedsCount === 'number'
      ? Math.max(todayDeedsCount, practice.good_deeds || 0)
      : practice.good_deeds || 0;
  const effectiveThoughts =
    typeof todayThoughtsCount === 'number'
      ? Math.max(todayThoughtsCount, practice.observing_thoughts || 0)
      : practice.observing_thoughts || 0;
  const daytimeDone = effectiveDeeds >= 1 || effectiveThoughts >= 1;

  const eveningDone = Boolean(practice.evening_class || practice.full_dedication);

  const doneMap: Record<DailyPathStepId, boolean> = {
    morning: morningDone,
    practice: practiceDone,
    daytime: daytimeDone,
    evening: eveningDone,
  };

  let currentStepId: DailyPathStepId | null = null;
  if (isEveningWindow) {
    if (!eveningDone) {
      currentStepId = 'evening';
    } else if (!morningDone) {
      currentStepId = 'morning';
    } else if (!practiceDone) {
      currentStepId = 'practice';
    } else if (!daytimeDone) {
      currentStepId = 'daytime';
    }
  } else {
    if (!morningDone) {
      currentStepId = 'morning';
    } else if (!practiceDone) {
      currentStepId = 'practice';
    } else if (!daytimeDone) {
      currentStepId = 'daytime';
    }
  }

  const rawSteps: Array<{ id: DailyPathStepId; shortLabel: string; title: string }> = [
    { id: 'morning', shortLabel: '晨愿', title: '晨 · 发愿' },
    {
      id: 'practice',
      shortLabel: hasConfiguredPractice ? '定课' : '设定定课',
      title: hasConfiguredPractice ? '定课' : '设定定课',
    },
    { id: 'daytime', shortLabel: '行善', title: '日 · 行善与觉察' },
    { id: 'evening', shortLabel: '晚课', title: '晚 · 回向复盘' },
  ];

  const steps: DailyPathStep[] = rawSteps.map((s) => {
    const done = doneMap[s.id];
    return {
      ...s,
      done,
      status: done ? 'done' : s.id === currentStepId ? 'current' : 'upcoming',
    };
  });

  const estimatedMinutes = estimatePracticeMinutes(unfinishedItems.length > 0 ? unfinishedItems : enabledItems);

  const buildPendingDaytimeNotices = (): PendingDaytimeNotice[] => {
    const notices: PendingDaytimeNotice[] = [];
    if (!hasConfiguredPractice) {
      notices.push({
        stepId: 'practice',
        label: '尚未设定每日定课，也可以先做晚课',
      });
    } else if (unfinishedItems.length > 0) {
      notices.push({
        stepId: 'practice',
        label: `今天的定课还差 ${unfinishedItems.length} 项，也可以先做晚课`,
      });
    }
    if (!morningDone) {
      notices.push({
        stepId: 'morning',
        label: '今天还没发愿，也可以先做晚课',
      });
    }
    if (!daytimeDone && notices.length === 0) {
      notices.push({
        stepId: 'daytime',
        label: '今天还没记行善或观心，也可以先做晚课',
      });
    }
    return notices;
  };

  let next: DailyPathNextAction;

  if (isEveningWindow) {
    if (!eveningDone) {
      const notices = buildPendingDaytimeNotices();
      next = {
        kind: 'evening',
        label: '晚课 · 回向复盘',
        target: 'evening-review',
        caption: notices[0]?.label || '在睡前合十回向，安顿今日心念',
        pendingDaytimeNotices: notices,
      };
    } else {
      next = {
        kind: 'all-done',
        label: '今日功课已圆满 · 再坐一会儿',
        target: 'meditation',
        caption: '夜间静心安住，不必勉强',
      };
    }
  } else {
    if (!morningDone) {
      next = {
        kind: 'morning',
        label: '晨课发愿 · 开始今日修行',
        target: 'ritual',
        caption: hasConfiguredPractice
          ? `今日定课约 ${estimatedMinutes} 分钟`
          : '约 1 分钟收摄身心，写下今日一念',
      };
    } else if (!practiceDone) {
      if (!hasConfiguredPractice) {
        next = {
          kind: 'setup-practice',
          label: '设定定课',
          target: 'daily-practice-settings',
          caption: '选几部常诵的经文或静坐，以后一键接着走',
        };
      } else {
        const partialChant = unfinishedItems.find(
          (item) => !isMeditationEntry(item) && (counts[item.scriptureId] || 0) > 0
        );
        const firstUnfinished = partialChant || unfinishedItems[0];

        if (partialChant) {
          const title =
            scriptureTitles[partialChant.scriptureId] || partialChant.scriptureId;
          const currentCount = counts[partialChant.scriptureId] || 0;
          next = {
            kind: 'practice-continue',
            label: `继续：${title} ${currentCount}/${partialChant.target}`,
            target: 'fish',
            scriptureId: partialChant.scriptureId,
            caption: `今日定课还剩 ${unfinishedItems.length} 项 · 约 ${estimatedMinutes} 分钟`,
          };
        } else if (isMeditationEntry(firstUnfinished)) {
          const mins = firstUnfinished.minutes || firstUnfinished.target || 15;
          next = {
            kind: 'practice-meditation',
            label: `开始定课：静坐 ${mins} 分钟`,
            target: 'meditation',
            meditationMinutes: mins,
            caption: `今日定课还剩 ${unfinishedItems.length} 项 · 约 ${estimatedMinutes} 分钟`,
          };
        } else {
          const title =
            scriptureTitles[firstUnfinished.scriptureId] ||
            firstUnfinished.scriptureId;
          next = {
            kind: 'practice-start',
            label: `开始定课：${title}`,
            target: 'fish',
            scriptureId: firstUnfinished.scriptureId,
            caption: `今日定课共 ${enabledItems.length} 项 · 约 ${estimatedMinutes} 分钟`,
          };
        }
      }
    } else if (!daytimeDone) {
      next = {
        kind: 'daytime',
        label: '观一念 / 记一善',
        target: 'thought-collector',
        secondaryLink: {
          label: '记一善',
          target: 'good-deed-collector',
        },
        caption: '日常转念或随手一善，都是修行',
      };
    } else {
      next = {
        kind: 'all-done',
        label: '今日功课已圆满 · 再坐一会儿',
        target: 'meditation',
        caption: '白天功课已圆满，可静坐安住或留待晚课回向',
      };
    }
  }

  return {
    steps,
    next,
    isEveningWindow,
    practiceProgress: {
      hasConfiguredPractice,
      totalCount: enabledItems.length,
      completedCount: completedItemsCount,
      estimatedMinutes,
    },
  };
}
