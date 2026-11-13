import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Brain, BookOpen, Clock, Moon, Check, ChevronDown, ChevronRight, Leaf, Feather } from 'lucide-react';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';
import { practiceService } from '../services/practiceService';
import { recordVault } from '../services/recordVault';
import { safeStorage } from '../utils/safeStorage';
import { DailyZenQuote } from './DailyZenQuote';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
  personalVow?: string;
}

type TimelineSectionId = 'morning' | 'day' | 'evening';

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, personalVow: personalVowProp }) => {
  const { t } = useTranslation();

  // Workflow states (same storage schema as before)
  const [workflowState, setWorkflowState] = useState({
    morning: false,
    goodDeed: false,
    mindfulness: false,
    evening: false,
    eveningClass: false,
  });

  const [localPersonalVow, setLocalPersonalVow] = useState<string>(() => safeStorage.getItem('personal_vow') || '');
  const effectiveVow = (personalVowProp !== undefined ? personalVowProp : localPersonalVow).trim();
  const hasPersonalVow = effectiveVow.length > 0;
  const [todayThoughtsCount, setTodayThoughtsCount] = useState(0);
  const [todayDeedsCount, setTodayDeedsCount] = useState(0);
  const [practicedDates, setPracticedDates] = useState<Set<string>>(new Set());
  const [expandedTimeline, setExpandedTimeline] = useState<TimelineSectionId | null>(null);
  const [allDailyCompleted, setAllDailyCompleted] = useState<boolean>(false);

  // Load and refresh practice statistics
  const fetchAllStats = async () => {
    const todayStr = new Date().toDateString();

    // 1. Practice dates from recordVault
    const records = await recordVault.getRecords();
    const pDates = new Set<string>();
    records.forEach((h) => {
      const ts = h.endTime || h.timestamp || h.startTime || Number(h.id);
      if (ts) {
        pDates.add(new Date(ts).toDateString());
      }
    });
    setPracticedDates(pDates);

    // 2. Thoughts count
    const savedThoughts = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const todayThoughts = savedThoughts.filter(
      (item: any) => new Date(item.timestamp || item.id).toDateString() === todayStr
    );
    setTodayThoughtsCount(todayThoughts.length);

    // 3. Good deeds count
    const savedDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
    const todayDeeds = savedDeeds.filter((d: any) => {
      const isToday = new Date(d.date || d.timestamp).toDateString() === todayStr;
      const isChanting = d.content && (d.content.includes('念诵') || d.content.includes('禅修'));
      return isToday && !isChanting;
    });
    setTodayDeedsCount(todayDeeds.length);

    // 4. Daily practice completion status
    const practiceList = practiceService.getDailyPracticeList().filter((item) => item.enabled);
    const todayPractice = practiceService.getDailyPractice();
    const counts = todayPractice.scriptureCounts || {};
    setAllDailyCompleted(
      practiceList.length > 0 &&
        practiceList.every((item) => (counts[item.scriptureId] || 0) >= item.target)
    );
  };

  useEffect(() => {
    const savedWorkflow = safeStorage.getJSON<any>('zen_workflow', null);
    if (savedWorkflow) {
      if (savedWorkflow.date === new Date().toDateString()) {
        setWorkflowState(savedWorkflow.state);
      } else {
        setWorkflowState((prev) => ({
          ...prev,
          morning: false,
          goodDeed: false,
          mindfulness: false,
          evening: false,
          eveningClass: false,
        }));
      }
    } else {
      const practice = practiceService.getDailyPractice();
      setWorkflowState((prev) => ({ ...prev, eveningClass: practice.evening_class }));
    }

    const syncVow = () => setLocalPersonalVow(safeStorage.getItem('personal_vow') || '');

    fetchAllStats();
    window.addEventListener('storage', fetchAllStats);
    window.addEventListener('addExp', fetchAllStats);
    window.addEventListener('zen_data_updated', fetchAllStats);
    window.addEventListener('zen_practice_settings_updated', fetchAllStats);
    window.addEventListener('vow_updated', syncVow);

    return () => {
      window.removeEventListener('storage', fetchAllStats);
      window.removeEventListener('addExp', fetchAllStats);
      window.removeEventListener('zen_data_updated', fetchAllStats);
      window.removeEventListener('zen_practice_settings_updated', fetchAllStats);
      window.removeEventListener('vow_updated', syncVow);
    };
  }, []);

  useEffect(() => {
    safeStorage.setJSON('zen_workflow', {
      date: new Date().toDateString(),
      state: workflowState,
    });
  }, [workflowState]);

  const toggleWorkflow = (key: keyof typeof workflowState) => {
    setWorkflowState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate 7 days for the current week (Monday to Sunday)
  const getWeekDays = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    return labels.map((label, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateStr = d.toDateString();
      return {
        label,
        isToday: dateStr === now.toDateString(),
        hasPracticed: practicedDates.has(dateStr),
      };
    });
  };

  const weekDaysList = getWeekDays();

  const todayDateStr = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = yesterday.toDateString();
  const showWelcomeBack = !practicedDates.has(todayDateStr) && !practicedDates.has(yesterdayDateStr);

  const timelineItems: {
    id: TimelineSectionId;
    title: string;
    description: string;
    completed: boolean;
  }[] = [
    {
      id: 'morning',
      title: '晨 · 发愿',
      description: t('morning_routine_desc'),
      completed: workflowState.morning,
    },
    {
      id: 'day',
      title: '日 · 行善与觉察',
      description: t('daily_zen_desc'),
      completed: workflowState.goodDeed && workflowState.mindfulness,
    },
    {
      id: 'evening',
      title: '晚 · 回向复盘',
      description: t('evening_reflection_desc'),
      completed: workflowState.evening,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-xl mx-auto w-full px-5 space-y-6 pb-28"
    >
      {/* 0. 今日愿景卡片 */}
      <section aria-label="今日愿景">
        <button
          type="button"
          onClick={() => onNavigate?.(hasPersonalVow ? 'vow' : 'vow-setup')}
          className={cn(
            'group w-full min-h-[56px] rounded-2xl px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer flex items-center justify-between gap-4',
            hasPersonalVow
              ? 'bg-gradient-to-br from-accent-mist/45 via-surface to-surface border border-line-strong hover:border-accent/50'
              : 'bg-surface-2/65 border border-dashed border-line-strong hover:border-accent/50 hover:bg-surface'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-caption">
              {hasPersonalVow ? (
                <Leaf className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.75} />
              ) : (
                <Feather className="w-3.5 h-3.5 text-gold shrink-0" strokeWidth={1.75} />
              )}
              <span className={cn('font-medium', hasPersonalVow ? 'text-accent' : 'text-ink-2')}>
                今日愿景
              </span>
              <span className="text-ink-3" aria-hidden="true">·</span>
              <span className="text-ink-3">
                {hasPersonalVow ? '已立愿' : '尚未立愿'}
              </span>
            </div>
            <p
              className={cn(
                'mt-1 font-serif text-[15px] leading-relaxed line-clamp-2',
                hasPersonalVow ? 'text-ink' : 'text-ink-2'
              )}
            >
              {hasPersonalVow ? effectiveVow : '写下今日的一念初心，让日常修行有所归处'}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs whitespace-nowrap shrink-0 transition-colors',
              hasPersonalVow
                ? 'text-ink-3 group-hover:text-accent'
                : 'font-medium text-accent'
            )}
          >
            <span>{hasPersonalVow ? '愿簿' : '去立愿'}</span>
            <ChevronRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </span>
        </button>
      </section>

      {/* 1. 晨雾区 */}
      <section className="relative min-h-[22vh] sm:min-h-[26vh] flex flex-col items-center justify-center py-4 sm:py-6 -mx-5 px-5 overflow-hidden">
        {/* Two subtle radial gradients (top-right accent-mist, bottom-left cloud-mist, 0.7 opacity) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 86% 14%, var(--theme-accent-mist) 0%, transparent 56%), radial-gradient(circle at 14% 86%, var(--theme-cloud-mist) 0%, transparent 56%)',
          }}
        />

        {/* Large 1px partial-circle arc echoing the Logo outer ring */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-line-strong opacity-60 pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 68%, transparent 94%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 68%, transparent 94%)',
          }}
        />

        {/* Centered DailyZenQuote without card border */}
        <DailyZenQuote variant="mist" />
      </section>

      {/* 3. 主动作 */}
      <section className="flex flex-col items-center">
        <div className="relative w-full">
          <motion.div
            aria-hidden="true"
            animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.04, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-full bg-accent-soft blur-md pointer-events-none"
          />
          <button
            type="button"
            onClick={() => onNavigate?.(allDailyCompleted ? 'meditation' : 'daily-practice')}
            className="relative w-full h-14 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-base font-medium transition-colors flex items-center justify-center cursor-pointer"
          >
            {allDailyCompleted ? '今日定课已圆满 · 再坐一会儿' : '开始今日定课'}
          </button>
        </div>

        <p className="text-caption mt-4 flex items-center justify-center gap-1.5 flex-wrap">
          <span>或　</span>
          <button
            type="button"
            onClick={() => onNavigate?.('fish')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            木鱼
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('meditation')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            静坐
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('scripture')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            读经
          </button>
        </p>
      </section>

      {/* 4. 七日足迹 */}
      <section className="flex flex-col items-center space-y-3">
        {showWelcomeBack && (
          <p className="text-caption text-center">欢迎回来，从这一念开始。</p>
        )}

        <div className="w-full max-w-sm grid grid-cols-7 gap-2 items-center">
          {weekDaysList.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 select-none">
              <div
                className={cn(
                  'w-[10px] h-[10px] rounded-full transition-all',
                  !day.hasPracticed && 'border border-line-strong',
                  day.isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-paper'
                )}
                style={day.hasPracticed ? { background: 'var(--theme-gradient)' } : undefined}
              />
              <span className={cn('text-caption', day.isToday && 'text-accent font-medium')}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 今日修行（竖向时间线） */}
      <section className="pt-2">
        <div className="space-y-0">
          {timelineItems.map((item, idx) => {
            const isLast = idx === timelineItems.length - 1;
            const isExpanded = expandedTimeline === item.id;

            return (
              <div key={item.id} className="flex gap-4">
                {/* Left Node & Vertical Connecting Line */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    aria-label={`切换${item.title}完成状态`}
                    onClick={() => {
                      if (item.id === 'morning') toggleWorkflow('morning');
                      else if (item.id === 'evening') toggleWorkflow('evening');
                      else {
                        const bothDone = workflowState.goodDeed && workflowState.mindfulness;
                        setWorkflowState((prev) => ({
                          ...prev,
                          goodDeed: !bothDone,
                          mindfulness: !bothDone,
                        }));
                      }
                    }}
                    className={cn(
                      'w-3 h-3 rounded-full mt-2 transition-colors cursor-pointer shrink-0',
                      item.completed
                        ? 'bg-accent border border-accent'
                        : 'border border-line-strong bg-paper hover:border-accent'
                    )}
                  />
                  {!isLast && <div className="w-px flex-1 bg-line my-1.5 min-h-[28px]" />}
                </div>

                {/* Right Content Column */}
                <div className={cn('flex-1 min-w-0', !isLast && 'pb-7')}>
                  <button
                    type="button"
                    onClick={() => setExpandedTimeline(isExpanded ? null : item.id)}
                    className="w-full text-left flex items-start justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h3 className="text-title text-ink group-hover:text-accent transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-caption mt-0.5">{item.description}</p>
                    </div>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.5}
                      className={cn(
                        'text-ink-3 mt-1.5 shrink-0 transition-transform duration-250',
                        isExpanded && 'rotate-180 text-accent'
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`${item.id}-content`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-2.5">
                          {item.id === 'morning' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onNavigate?.('fish')}
                                className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-accent" />
                                <span>{t('morning_chant')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onNavigate?.('meditation')}
                                className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Clock className="w-3.5 h-3.5 text-accent" />
                                <span>{t('morning_meditation')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleWorkflow('morning')}
                                className={cn(
                                  'py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1',
                                  workflowState.morning
                                    ? 'bg-accent text-on-accent border-accent'
                                    : 'bg-surface border-line text-ink-2 hover:text-accent'
                                )}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{workflowState.morning ? '已完成' : '标记完成'}</span>
                              </button>
                            </div>
                          )}

                          {item.id === 'day' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-line">
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.dispatchEvent(new CustomEvent('open-good-deed-collector'))
                                  }
                                  className="flex items-center gap-2.5 text-left flex-1"
                                >
                                  <div className="p-1.5 bg-accent-mist text-accent rounded-lg shrink-0">
                                    <Heart className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-xs text-ink">
                                      {t('random_good_deed')}
                                    </div>
                                    <div className="text-[11px] text-ink-3">
                                      今日已记 {todayDeedsCount} 次
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleWorkflow('goodDeed')}
                                  title="标记为完成"
                                  className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center transition-colors border',
                                    workflowState.goodDeed
                                      ? 'bg-accent text-on-accent border-accent'
                                      : 'bg-surface-2 border-line text-ink-3 hover:text-accent'
                                  )}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-line">
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.dispatchEvent(new CustomEvent('open-thought-collector'))
                                  }
                                  className="flex items-center gap-2.5 text-left flex-1"
                                >
                                  <div className="p-1.5 bg-accent-mist text-accent rounded-lg shrink-0">
                                    <Brain className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-xs text-ink">
                                      {t('mindful_moment')}
                                    </div>
                                    <div className="text-[11px] text-ink-3">
                                      今日已察 {todayThoughtsCount} 条
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleWorkflow('mindfulness')}
                                  title="标记为完成"
                                  className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center transition-colors border',
                                    workflowState.mindfulness
                                      ? 'bg-accent text-on-accent border-accent'
                                      : 'bg-surface-2 border-line text-ink-3 hover:text-accent'
                                  )}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {item.id === 'evening' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onNavigate?.('fish')}
                                className="flex-1 min-w-[90px] py-2.5 px-3 bg-surface rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-accent" />
                                <span>晚课诵经</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onNavigate?.('vow')}
                                className="flex-1 min-w-[90px] py-2.5 px-3 bg-surface rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-accent" />
                                <span>普皆回向</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onNavigate?.('meditation')}
                                className="flex-1 min-w-[90px] py-2.5 px-3 bg-surface rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Moon className="w-3.5 h-3.5 text-accent" />
                                <span>安眠静心</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleWorkflow('evening')}
                                className={cn(
                                  'py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1',
                                  workflowState.evening
                                    ? 'bg-accent text-on-accent border-accent'
                                    : 'bg-surface border-line text-ink-2 hover:text-accent'
                                )}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{workflowState.evening ? '已完成' : '标记完成'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
};
