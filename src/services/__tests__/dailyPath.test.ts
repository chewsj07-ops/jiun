import { describe, it, expect } from 'vitest';
import { getDailyPath } from '../dailyPath';
import { DailyPractice, DailyPracticeItem, MEDITATION_PRACTICE_ID } from '../../types/practice';

function basePractice(overrides: Partial<DailyPractice> = {}): DailyPractice {
  return {
    date: '2026-11-14',
    chanting: 0,
    scriptureCounts: {},
    celebratedScriptures: [],
    meditation: 0,
    observing_thoughts: 0,
    rejoicing: 0,
    good_deeds: 0,
    dedication: false,
    full_dedication: false,
    evening_class: false,
    ...overrides,
  };
}

const sampleDailyPractice: DailyPracticeItem[] = [
  { scriptureId: 'heart-sutra', target: 3, unit: '遍', order: 0, enabled: true },
  { scriptureId: 'great-compassion', target: 21, unit: '声', order: 1, enabled: true },
];

const sampleTitles: Record<string, string> = {
  'heart-sutra': '心经',
  'great-compassion': '大悲咒',
};

describe('getDailyPath (W1/W2/W3 state machine)', () => {
  it('1. 早上全新一天：第一步晨愿为 current，主按钮引导晨课发愿', () => {
    const result = getDailyPath(
      {
        practice: basePractice(),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 8, 30)
    );

    expect(result.isEveningWindow).toBe(false);
    expect(result.steps.map((s) => s.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(result.next.kind).toBe('morning');
    expect(result.next.label).toBe('晨课发愿 · 开始今日修行');
    expect(result.next.target).toBe('ritual');
  });

  it('2. 仪轨已完成但定课念到一半：主按钮显示继续与今日累计进度', () => {
    const result = getDailyPath(
      {
        practice: basePractice({
          ritual_done: 'brief',
          scriptureCounts: { 'heart-sutra': 3, 'great-compassion': 12 },
          celebratedScriptures: ['heart-sutra'],
        }),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 10, 0)
    );

    expect(result.steps[0].done).toBe(true);
    expect(result.steps[1].status).toBe('current');
    expect(result.next.kind).toBe('practice-continue');
    expect(result.next.label).toBe('继续：大悲咒 12/21');
    expect(result.next.scriptureId).toBe('great-compassion');
  });

  it('2b. 仅写下今日一念即视为晨愿已完成（W2）', () => {
    const result = getDailyPath(
      {
        practice: basePractice({
          todayIntention: '对家人多一分耐心',
        }),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 9, 0)
    );

    expect(result.steps[0].done).toBe(true);
    expect(result.next.kind).toBe('practice-start');
    expect(result.next.label).toBe('开始定课：心经');
  });

  it('2c. 尚未设定定课时显示「设定定课」', () => {
    const result = getDailyPath(
      {
        practice: basePractice({ ritual_done: 'skip' }),
        dailyPracticeList: [],
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 9, 0)
    );

    expect(result.next.kind).toBe('setup-practice');
    expect(result.next.label).toBe('设定定课');
    expect(result.next.target).toBe('daily-practice-settings');
  });

  it('3. 白天全部完成（18:00 前）：主按钮显示「今日功课已圆满 · 再坐一会儿」', () => {
    const result = getDailyPath(
      {
        practice: basePractice({
          ritual_done: 'full',
          scriptureCounts: { 'heart-sutra': 3, 'great-compassion': 21 },
          celebratedScriptures: ['heart-sutra', 'great-compassion'],
          good_deeds: 1,
        }),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 16, 0)
    );

    expect(result.steps[0].done).toBe(true);
    expect(result.steps[1].done).toBe(true);
    expect(result.steps[2].done).toBe(true);
    expect(result.next.kind).toBe('all-done');
    expect(result.next.label).toBe('今日功课已圆满 · 再坐一会儿');
    expect(result.next.target).toBe('meditation');
  });

  it('4. 晚上 19:00 定课未完成：主按钮切换为晚课，下方温和提示定课差额', () => {
    const result = getDailyPath(
      {
        practice: basePractice({
          ritual_done: 'brief',
          scriptureCounts: { 'heart-sutra': 3 },
          celebratedScriptures: ['heart-sutra'],
        }),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 19, 0)
    );

    expect(result.isEveningWindow).toBe(true);
    expect(result.steps[3].status).toBe('current');
    expect(result.next.kind).toBe('evening');
    expect(result.next.label).toBe('晚课 · 回向复盘');
    expect(result.next.target).toBe('evening-review');
    expect(result.next.pendingDaytimeNotices?.some((n) => n.label.includes('定课还差 1 项'))).toBe(true);
  });

  it('4b. 凌晨 01:30 仍适用晚课规则', () => {
    const result = getDailyPath(
      {
        practice: basePractice({ ritual_done: 'brief' }),
        dailyPracticeList: sampleDailyPractice,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 15, 1, 30)
    );

    expect(result.isEveningWindow).toBe(true);
    expect(result.next.kind).toBe('evening');
  });

  it('5. 定课包含静坐项目（W3）且全部圆满后，进入晚课与全天圆满状态', () => {
    const withMeditation: DailyPracticeItem[] = [
      ...sampleDailyPractice,
      {
        scriptureId: MEDITATION_PRACTICE_ID,
        kind: 'meditation',
        minutes: 15,
        target: 15,
        order: 2,
        enabled: true,
      },
    ];

    // Before meditation celebrated -> next points to meditation
    const beforeMed = getDailyPath(
      {
        practice: basePractice({
          ritual_done: 'full',
          scriptureCounts: { 'heart-sutra': 3, 'great-compassion': 21 },
          celebratedScriptures: ['heart-sutra', 'great-compassion'],
        }),
        dailyPracticeList: withMeditation,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 14, 0)
    );

    expect(beforeMed.steps[1].done).toBe(false);
    expect(beforeMed.next.kind).toBe('practice-meditation');
    expect(beforeMed.next.label).toBe('开始定课：静坐 15 分钟');

    // After meditation + evening done -> all 4 steps done
    const allDone = getDailyPath(
      {
        practice: basePractice({
          ritual_done: 'full',
          scriptureCounts: { 'heart-sutra': 3, 'great-compassion': 21 },
          celebratedScriptures: ['heart-sutra', 'great-compassion', MEDITATION_PRACTICE_ID],
          observing_thoughts: 1,
          full_dedication: true,
          evening_class: true,
        }),
        dailyPracticeList: withMeditation,
        scriptureTitles: sampleTitles,
      },
      new Date(2026, 10, 14, 21, 0)
    );

    expect(allDone.steps.every((s) => s.done)).toBe(true);
    expect(allDone.next.kind).toBe('all-done');
    expect(allDone.next.label).toBe('今日功课已圆满 · 再坐一会儿');
  });
});
