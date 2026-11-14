import { describe, it, expect } from 'vitest';
import { buildEveningSummary } from '../eveningReviewService';
import { DailyPractice, MEDITATION_PRACTICE_ID } from '../../types/practice';
import { Scripture } from '../../constants';

const mockScriptures: Scripture[] = [
  {
    id: 'heart-sutra',
    title: '心经',
    category: 'sutra',
    subtitle: '',
    content: '',
    explanation: '',
    source: '',
  },
  {
    id: 'amitabha',
    title: '南无阿弥陀佛',
    category: 'name',
    subtitle: '',
    content: '',
    explanation: '',
    source: '',
  },
];

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

describe('buildEveningSummary (W5)', () => {
  it('空记录的一天返回 hasAnyActivity: false', () => {
    const summary = buildEveningSummary({
      dailyPractice: basePractice(),
      scriptures: mockScriptures,
      history: [],
      todayDeedsCount: 0,
      todayThoughtsCount: 0,
      now: new Date(2026, 10, 14, 21, 0),
    });

    expect(summary.hasAnyActivity).toBe(false);
    expect(summary.chantingItems).toEqual([]);
    expect(summary.meditationMinutes).toBe(0);
    expect(summary.goodDeedsCount).toBe(0);
    expect(summary.thoughtsCount).toBe(0);
  });

  it('正确整理今日诵经（带单位）、静坐分钟、行善与观心次数', () => {
    const now = new Date(2026, 10, 14, 21, 30);
    const summary = buildEveningSummary({
      dailyPractice: basePractice({
        scriptureCounts: {
          'heart-sutra': 3,
          amitabha: 108,
          [MEDITATION_PRACTICE_ID]: 1,
        },
        meditation: 15,
      }),
      dailyPracticeList: [
        { scriptureId: 'heart-sutra', target: 3, unit: '遍', order: 0, enabled: true },
        { scriptureId: 'amitabha', target: 108, unit: '声', order: 1, enabled: true },
      ],
      scriptures: mockScriptures,
      history: [
        // Yesterday record should be ignored
        {
          id: 1,
          chant: '大悲咒',
          count: 7,
          unit: '遍',
          type: '持咒',
          endTime: new Date(2026, 10, 13, 20, 0).getTime(),
        },
        // Manual backfill today for a scripture not in scriptureCounts
        {
          id: 2,
          chant: '普门品',
          count: 1,
          unit: '遍',
          type: '诵经',
          endTime: new Date(2026, 10, 14, 15, 0).getTime(),
        },
      ],
      todayDeedsCount: 2,
      todayThoughtsCount: 3,
      now,
    });

    expect(summary.hasAnyActivity).toBe(true);
    expect(summary.chantingItems).toEqual([
      { id: 'heart-sutra', title: '心经', count: 3, unit: '遍' },
      { id: 'amitabha', title: '南无阿弥陀佛', count: 108, unit: '声' },
      { id: 'hist-普门品', title: '普门品', count: 1, unit: '遍' },
    ]);
    expect(summary.meditationMinutes).toBe(15);
    expect(summary.goodDeedsCount).toBe(2);
    expect(summary.thoughtsCount).toBe(3);
  });

  it('凌晨 01:30 打开仍算昨晚的修行日，保留昨晚念诵记录与晚课草稿', async () => {
    const {
      getPracticeDateKey,
      isSamePracticeDay,
      practiceService,
    } = await import('../practiceService');
    const { loadEveningReviewDraft, saveEveningReviewDraft, clearEveningReviewDraft } =
      await import('../eveningReviewService');

    const lateNight = new Date(2026, 10, 15, 1, 30); // Nov 15 01:30 AM -> practice day 2026-11-14
    const nextMorning = new Date(2026, 10, 15, 4, 15); // Nov 15 04:15 AM -> practice day 2026-11-15

    expect(getPracticeDateKey(lateNight)).toBe('2026-11-14');
    expect(getPracticeDateKey(nextMorning)).toBe('2026-11-15');
    expect(
      isSamePracticeDay(new Date(2026, 10, 14, 21, 0).getTime(), lateNight)
    ).toBe(true);
    expect(
      isSamePracticeDay(new Date(2026, 10, 14, 21, 0).getTime(), nextMorning)
    ).toBe(false);

    const summary = buildEveningSummary({
      dailyPractice: basePractice({ date: '2026-11-14' }),
      scriptures: mockScriptures,
      history: [
        {
          id: 101,
          chant: '普门品',
          count: 1,
          unit: '遍',
          type: '诵经',
          endTime: new Date(2026, 10, 14, 22, 0).getTime(),
        },
      ],
      now: lateNight,
    });
    expect(summary.chantingItems).toEqual([
      { id: 'hist-普门品', title: '普门品', count: 1, unit: '遍' },
    ]);

    saveEveningReviewDraft({
      date: '2026-11-14',
      stepIndex: 2,
      intentionCheck: 'done',
      reflectionText: '睡前观照草稿',
      confessionText: '',
      rejoiceText: '',
      dedicationDone: false,
      tomorrowIntention: '',
      isCompleteScreen: false,
    });

    expect(loadEveningReviewDraft(lateNight).reflectionText).toBe('睡前观照草稿');
    expect(loadEveningReviewDraft(nextMorning).reflectionText).toBe('');
    clearEveningReviewDraft();

    practiceService.saveTomorrowIntention('明天早起深呼吸', lateNight);
    expect(practiceService.getDailyPractice(lateNight).todayIntention).toBeUndefined();
    expect(practiceService.getDailyPractice(nextMorning).todayIntention).toBe(
      '明天早起深呼吸'
    );
  });
});

