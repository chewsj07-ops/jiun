import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Brain,
  Check,
  Clock,
  Feather,
  Heart,
  Leaf,
  Moon,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import {
  DailyPathNextAction,
  DailyPathResult,
  DailyPathStepId,
} from '../services/dailyPath';
import { practiceService } from '../services/practiceService';
import { DailyPractice } from '../types/practice';

const INTENTION_SUGGESTIONS = [
  '对家人多一分耐心',
  '今天少说一句抱怨',
  '把功德回向给需要的人',
];

export interface DailyPathWorkflowState {
  morning: boolean;
  goodDeed: boolean;
  mindfulness: boolean;
  evening: boolean;
  eveningClass: boolean;
}

interface DailyPathCardProps {
  dailyPath: DailyPathResult;
  dailyPractice: DailyPractice;
  personalVow: string;
  todayDeedsCount: number;
  todayThoughtsCount: number;
  workflowState: DailyPathWorkflowState;
  onToggleWorkflow: (key: keyof DailyPathWorkflowState) => void;
  onNextAction: (next: DailyPathNextAction) => void;
  onNavigate?: (tab: string) => void;
}

export const DailyPathCard: React.FC<DailyPathCardProps> = ({
  dailyPath,
  dailyPractice,
  personalVow,
  todayDeedsCount,
  todayThoughtsCount,
  workflowState,
  onToggleWorkflow,
  onNextAction,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [expandedStep, setExpandedStep] = useState<DailyPathStepId | null>(null);
  const [showIntentionSheet, setShowIntentionSheet] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState(
    dailyPractice.todayIntention || ''
  );

  useEffect(() => {
    if (showIntentionSheet) {
      setIntentionDraft(dailyPractice.todayIntention || '');
    }
  }, [showIntentionSheet, dailyPractice.todayIntention]);

  const todayIntention = (dailyPractice.todayIntention || '').trim();
  const trimmedVow = personalVow.trim();
  const displayVowText = todayIntention || trimmedVow;
  const hasDisplayVow = displayVowText.length > 0;

  const handleSaveIntention = () => {
    practiceService.saveTodayIntention(intentionDraft);
    setShowIntentionSheet(false);
  };

  const handleToggleMorningDone = () => {
    const isCurrentlyDone = Boolean(dailyPractice.ritual_done);
    if (isCurrentlyDone) {
      const latest = practiceService.getDailyPractice();
      const { ritual_done: _removed, ...rest } = latest;
      practiceService.saveDailyPractice(rest);
      if (workflowState.morning) onToggleWorkflow('morning');
    } else {
      practiceService.setRitualDone('skip');
      if (!workflowState.morning) onToggleWorkflow('morning');
    }
  };

  const handleToggleEveningDone = () => {
    const isDone = Boolean(
      dailyPractice.evening_class || dailyPractice.full_dedication
    );
    practiceService.updateActivity('evening_class', !isDone);
    if (isDone) {
      const latest = practiceService.getDailyPractice();
      if (latest.full_dedication) {
        practiceService.saveDailyPractice({ ...latest, full_dedication: false });
      }
      if (workflowState.evening) onToggleWorkflow('evening');
    } else {
      if (!workflowState.evening) onToggleWorkflow('evening');
    }
  };

  const handlePendingNoticeClick = (stepId: 'morning' | 'practice' | 'daytime') => {
    if (stepId === 'morning') {
      onNavigate?.('ritual');
    } else if (stepId === 'practice') {
      onNavigate?.(
        dailyPath.practiceProgress.hasConfiguredPractice
          ? 'daily-practice'
          : 'daily-practice-settings'
      );
    } else {
      window.dispatchEvent(new CustomEvent('open-thought-collector'));
    }
  };

  const { steps, next, practiceProgress } = dailyPath;

  return (
    <>
      <section
        aria-label="今日之路"
        className="bg-surface border border-line rounded-2xl p-4 sm:p-5 space-y-4"
      >
        {/* 第一行：今日一念 */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (hasDisplayVow) {
                onNavigate?.('vow');
              } else {
                setShowIntentionSheet(true);
              }
            }}
            className="flex-1 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl"
          >
            <div className="flex items-center gap-1.5 text-caption">
              {hasDisplayVow ? (
                <Leaf className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.75} />
              ) : (
                <Feather className="w-3.5 h-3.5 text-gold shrink-0" strokeWidth={1.75} />
              )}
              <span className="text-ink-2 font-medium">今日一念</span>
              {!todayIntention && trimmedVow && (
                <span className="text-ink-3">· 长期愿力</span>
              )}
            </div>
            <p
              className={cn(
                'mt-1 font-serif text-[15px] sm:text-[16px] leading-[1.6] line-clamp-2 break-words transition-colors',
                hasDisplayVow
                  ? 'text-ink group-hover:text-accent'
                  : 'text-ink-2 group-hover:text-accent'
              )}
            >
              {hasDisplayVow ? displayVowText : '写下今日的一念初心 →'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setShowIntentionSheet(true)}
            className="shrink-0 min-h-[36px] px-2.5 rounded-full text-xs text-accent hover:bg-accent-mist transition-colors font-medium"
          >
            {todayIntention ? '修改一念' : '写一念'}
          </button>
        </div>

        {/* 第二行：四个步骤的横向进度 */}
        <div className="pt-0.5">
          <div className="flex items-start">
            {steps.map((step, idx) => {
              const isSelected = expandedStep === step.id;
              const isDone = step.status === 'done';
              const isCurrent = step.status === 'current';
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    aria-expanded={isSelected}
                    aria-label={`${step.title}${isDone ? '（已完成）' : isCurrent ? '（当前步骤）' : ''}`}
                    onClick={() =>
                      setExpandedStep((prev) => (prev === step.id ? null : step.id))
                    }
                    className="flex flex-col items-center gap-1.5 min-w-[52px] min-h-[44px] py-1 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl"
                  >
                    <span
                      className={cn(
                        'w-3.5 h-3.5 rounded-full transition-all flex items-center justify-center',
                        !isDone && !isCurrent && 'border border-line-strong bg-surface group-hover:border-accent',
                        isCurrent &&
                          !isDone &&
                          'border border-accent bg-surface ring-2 ring-accent ring-offset-2 ring-offset-surface',
                        isDone && isSelected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
                      )}
                      style={
                        isDone ? { background: 'var(--theme-gradient)' } : undefined
                      }
                    />
                    <span
                      className={cn(
                        'text-[11px] leading-tight whitespace-nowrap transition-colors',
                        isSelected || isCurrent
                          ? 'text-accent font-medium'
                          : isDone
                          ? 'text-ink-2'
                          : 'text-ink-3'
                      )}
                    >
                      {step.shortLabel}
                    </span>
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="flex-1 h-px bg-line mt-[11px] mx-1"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 展开某一步的详细内容（原时间线里的入口与手动打卡） */}
          <AnimatePresence initial={false}>
            {expandedStep && (
              <motion.div
                key={`step-detail-${expandedStep}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-line space-y-2.5">
                  {expandedStep === 'morning' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink">晨 · 发愿</p>
                          <p className="text-caption">{t('morning_routine_desc')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleMorningDone}
                          className={cn(
                            'py-1.5 px-3 rounded-full border text-xs font-medium transition-colors flex items-center gap-1 shrink-0',
                            dailyPath.steps[0]?.done
                              ? 'bg-accent text-on-accent border-accent'
                              : 'bg-surface-2 border-line text-ink-2 hover:text-accent'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {dailyPath.steps[0]?.done ? '已完成' : '标记完成'}
                          </span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate?.('ritual')}
                          className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span>晨课发愿仪轨</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowIntentionSheet(true)}
                          className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Feather className="w-3.5 h-3.5 text-accent" />
                          <span>写今日一念</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedStep === 'practice' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {practiceProgress.hasConfiguredPractice
                              ? `今日定课 (${practiceProgress.completedCount}/${practiceProgress.totalCount})`
                              : '尚未设定每日定课'}
                          </p>
                          <p className="text-caption">
                            {practiceProgress.hasConfiguredPractice
                              ? `预计还需约 ${practiceProgress.estimatedMinutes} 分钟`
                              : '把常诵经文、佛号或静坐加入定课，一键顺序完成'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('daily-practice-settings')}
                          className="py-1.5 px-3 rounded-full bg-surface-2 border border-line text-xs text-ink-2 hover:text-accent shrink-0"
                        >
                          定课设定
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate?.('fish')}
                          className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-accent" />
                          <span>{t('morning_chant')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('meditation')}
                          className="flex-1 min-w-[110px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          <span>{t('morning_meditation')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedStep === 'daytime' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-line">
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('open-good-deed-collector')
                            )
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
                              今日已记 {Math.max(todayDeedsCount, dailyPractice.good_deeds || 0)} 次
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWorkflow('goodDeed')}
                          title="标记为完成"
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center transition-colors border',
                            workflowState.goodDeed ||
                              Math.max(todayDeedsCount, dailyPractice.good_deeds || 0) > 0
                              ? 'bg-accent text-on-accent border-accent'
                              : 'bg-surface border-line text-ink-3 hover:text-accent'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-line">
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('open-thought-collector')
                            )
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
                              今日已察 {Math.max(todayThoughtsCount, dailyPractice.observing_thoughts || 0)} 条
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWorkflow('mindfulness')}
                          title="标记为完成"
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center transition-colors border',
                            workflowState.mindfulness ||
                              Math.max(
                                todayThoughtsCount,
                                dailyPractice.observing_thoughts || 0
                              ) > 0
                              ? 'bg-accent text-on-accent border-accent'
                              : 'bg-surface border-line text-ink-3 hover:text-accent'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedStep === 'evening' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink">
                            晚 · 回向复盘
                          </p>
                          <p className="text-caption">
                            {t('evening_reflection_desc')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleEveningDone}
                          className={cn(
                            'py-1.5 px-3 rounded-full border text-xs font-medium transition-colors flex items-center gap-1 shrink-0',
                            dailyPath.steps[3]?.done
                              ? 'bg-accent text-on-accent border-accent'
                              : 'bg-surface-2 border-line text-ink-2 hover:text-accent'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {dailyPath.steps[3]?.done ? '已完成' : '标记完成'}
                          </span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate?.('evening-review')}
                          className="w-full py-2.5 px-3 bg-accent-mist text-accent rounded-xl border border-accent/20 text-xs font-medium hover:bg-accent hover:text-on-accent transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>开始晚课回向复盘</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('fish')}
                          className="flex-1 min-w-[90px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-accent" />
                          <span>晚课诵经</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('meditation')}
                          className="flex-1 min-w-[90px] py-2.5 px-3 bg-surface-2 rounded-xl border border-line text-ink text-xs font-medium hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Moon className="w-3.5 h-3.5 text-accent" />
                          <span>安眠静心</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 第三行：主按钮 */}
        <div className="relative w-full pt-0.5">
          <motion.div
            aria-hidden="true"
            animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.03, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-full bg-accent-soft blur-md pointer-events-none"
          />
          <button
            type="button"
            onClick={() => onNextAction(next)}
            className="relative w-full h-14 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-base font-medium transition-colors flex items-center justify-center px-5 cursor-pointer"
          >
            <span className="truncate">{next.label}</span>
          </button>
        </div>

        {/* 按钮下方：次要说明 */}
        <div className="text-center space-y-1">
          {next.kind === 'daytime' && next.secondaryLink ? (
            <p className="text-caption flex items-center justify-center gap-2 flex-wrap">
              <span>{next.caption}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('open-good-deed-collector'))
                }
                className="text-accent font-medium hover:underline cursor-pointer"
              >
                {next.secondaryLink.label}
              </button>
            </p>
          ) : next.pendingDaytimeNotices && next.pendingDaytimeNotices.length > 0 ? (
            <div className="space-y-1">
              {next.pendingDaytimeNotices.slice(0, 2).map((notice) => (
                <button
                  key={notice.stepId}
                  type="button"
                  onClick={() => handlePendingNoticeClick(notice.stepId)}
                  className="block w-full text-caption text-ink-2 hover:text-accent transition-colors cursor-pointer"
                >
                  {notice.label} →
                </button>
              ))}
            </div>
          ) : next.caption ? (
            <p className="text-caption">{next.caption}</p>
          ) : null}
        </div>
      </section>

      {/* 今日一念底部输入弹层 */}
      <AnimatePresence>
        {showIntentionSheet && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIntentionSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl rounded-t-3xl bg-surface border-t border-line shadow-float p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
            >
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto -mt-1" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-title text-ink">今日一念</h3>
                  <p className="text-caption mt-0.5">
                    今天想带着哪一念出发？（留空也可直接修行）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIntentionSheet(false)}
                  aria-label="关闭"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <textarea
                value={intentionDraft}
                onChange={(e) => setIntentionDraft(e.target.value.slice(0, 200))}
                placeholder="例如：今天对家人多一分耐心..."
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-surface-2 border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none"
              />

              <div className="flex flex-wrap gap-2">
                {INTENTION_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIntentionDraft(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs border transition-colors',
                      intentionDraft === s
                        ? 'bg-accent-mist text-accent border-accent font-medium'
                        : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowIntentionSheet(false);
                    onNavigate?.('vow-setup');
                  }}
                  className="text-xs text-ink-2 hover:text-accent transition-colors"
                >
                  设定长期愿力 →
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIntentionSheet(false)}
                    className="h-10 px-4 rounded-full text-xs text-ink-2 hover:bg-surface-2 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIntention}
                    className="h-10 px-5 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-xs font-medium transition-colors"
                  >
                    保存今日一念
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
