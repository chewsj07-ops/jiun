import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, HelpCircle, Sparkles, X } from 'lucide-react';
import { Scripture } from '../constants';
import {
  DEDICATION_TARGET_OPTIONS,
  DedicationTargetType,
  RITUAL_STEPS,
  RitualMode,
  RitualRunMode,
  RitualStep,
  RitualStepId,
} from '../data/ritual';
import { RitualSettings, ritualService } from '../services/ritualService';
import { alignParagraphToRuby } from '../utils/rubyPinyin';
import { safeStorage } from '../utils/safeStorage';
import { playBreathChime, playCompletionBell } from '../utils/zenAudio';
import { cn } from '../lib/utils';

interface RitualFlowProps {
  isOpen: boolean;
  activeScripture: Scripture;
  personalVow: string;
  volume: number;
  onComplete: (meta: {
    runMode: RitualRunMode;
    dedicationTargetLabel: string;
  }) => void;
  onDirectStart: () => void;
  onCancel: () => void;
}

export const RitualFlow: React.FC<RitualFlowProps> = ({
  isOpen,
  activeScripture,
  personalVow,
  volume,
  onComplete,
  onDirectStart,
  onCancel,
}) => {
  const [settings, setSettings] = useState<RitualSettings>(() =>
    ritualService.getSettings()
  );
  const [showPinyin, setShowPinyin] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('zen_scripture_show_pinyin');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [showWhySheet, setShowWhySheet] = useState(false);

  // Step 1: Breathing (3 cycles of 4s inhale + 4s exhale)
  const [breathPhase, setBreathPhase] = useState<'吸' | '呼'>('吸');
  const [breathCount, setBreathCount] = useState(1); // 1..3
  const [breathingDone, setBreathingDone] = useState(false);

  // Step 2 & 3: Interactive tap repetitions
  const [homageDoneCount, setHomageDoneCount] = useState(0);
  const [pureMouthDoneCount, setPureMouthDoneCount] = useState(0);

  // Step 4: Optional local-only confession note
  const [confessionText, setConfessionText] = useState('');
  const savedConfessionRef = useRef<string>('');

  // Step 5: Dedication target ("这一座为谁而念")
  const [targetType, setTargetType] = useState<DedicationTargetType | null>(() => {
    return ritualService.getDailyState().dedicationTargetType;
  });
  const [customPersonName, setCustomPersonName] = useState<string>(() => {
    return ritualService.getDailyState().dedicationCustomName || '';
  });

  const autoAdvanceTimerRef = useRef<number | null>(null);

  const clearAutoAdvance = () => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  useEffect(() => {
    const syncSettings = () => setSettings(ritualService.getSettings());
    window.addEventListener('zen_ritual_settings_updated', syncSettings);
    return () =>
      window.removeEventListener('zen_ritual_settings_updated', syncSettings);
  }, []);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_scripture_show_pinyin', String(showPinyin));
    } catch {
      // ignore storage error
    }
  }, [showPinyin]);

  // Reset per-run state whenever RitualFlow opens
  useEffect(() => {
    if (!isOpen) {
      clearAutoAdvance();
      return;
    }
    setSettings(ritualService.getSettings());
    setStepIndex(0);
    setShowWhySheet(false);
    setBreathPhase('吸');
    setBreathCount(1);
    setBreathingDone(false);
    setHomageDoneCount(0);
    setPureMouthDoneCount(0);
    setConfessionText('');
    savedConfessionRef.current = '';
    const daily = ritualService.getDailyState();
    setTargetType(daily.dedicationTargetType);
    setCustomPersonName(daily.dedicationCustomName || '');

    return () => clearAutoAdvance();
  }, [isOpen]);

  const effectiveMode: RitualMode = useMemo(
    () => ritualService.getEffectiveMode(settings),
    [settings]
  );

  const isFirstTimeUser = !settings.hasCompletedFirstRitual;
  const shouldAutoExpandWhy = isFirstTimeUser;
  const showWhyTrigger = isFirstTimeUser || settings.showWhy;

  const isSutra = activeScripture.category === 'sutra';

  const activeSteps: RitualStep[] = useMemo(() => {
    const stepMap = new Map<RitualStepId, RitualStep>();
    RITUAL_STEPS.forEach((s) => stepMap.set(s.id, s));

    const ids: RitualStepId[] =
      effectiveMode === 'full'
        ? [
            'breathing',
            'homage',
            'pureMouth',
            'repentance',
            'vow',
            ...(isSutra ? (['openingSutra'] as RitualStepId[]) : []),
            'chantingGuide',
          ]
        : [
            'homage',
            'repentance',
            'vow',
            ...(isSutra ? (['openingSutra'] as RitualStepId[]) : []),
          ];

    return ids
      .map((id) => stepMap.get(id))
      .filter((s): s is RitualStep => Boolean(s));
  }, [effectiveMode, isSutra]);

  const currentStep = activeSteps[Math.min(stepIndex, activeSteps.length - 1)];
  const isLastStep = stepIndex >= activeSteps.length - 1;

  // Breathing 3-cycle timer (4s inhale / 4s exhale x 3 = 24s)
  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.id !== 'breathing') return;

    setBreathPhase('吸');
    setBreathCount(1);
    setBreathingDone(false);

    if (volume > 0) {
      playBreathChime(Math.min(0.24, volume));
    }

    let phaseTick = 0; // 0..5 -> 6 half-cycles (3 full breaths)
    const interval = window.setInterval(() => {
      phaseTick += 1;
      if (phaseTick >= 6) {
        window.clearInterval(interval);
        setBreathingDone(true);
        setBreathPhase('呼');
        if (volume > 0) {
          playCompletionBell(Math.min(0.45, volume));
        }
        return;
      }
      const isInhale = phaseTick % 2 === 0;
      setBreathPhase(isInhale ? '吸' : '呼');
      setBreathCount(Math.floor(phaseTick / 2) + 1);
      if (isInhale && volume > 0) {
        playBreathChime(Math.min(0.24, volume));
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isOpen, currentStep?.id, volume]);

  if (!isOpen || !currentStep) return null;

  const homageTargetReps =
    effectiveMode === 'brief' ? 1 : settings.homageStyle === 'prostrate3' ? 3 : 1;

  const pureMouthTargetReps = settings.pureMouthReps;

  const persistCurrentStepSideEffects = async () => {
    if (currentStep.id === 'repentance') {
      const trimmed = confessionText.trim();
      if (trimmed && trimmed !== savedConfessionRef.current) {
        savedConfessionRef.current = trimmed;
        await ritualService.saveConfessionToThoughts(trimmed);
      }
    }
    if (currentStep.id === 'vow') {
      ritualService.saveDailyState({
        dedicationTargetType: targetType,
        dedicationCustomName: customPersonName,
      });
    }
  };

  const finishRitual = async () => {
    clearAutoAdvance();
    await persistCurrentStepSideEffects();

    const targetLabel = ritualService.resolveDedicationTargetLabel(
      targetType,
      customPersonName
    );
    ritualService.saveDailyState({
      completedPreRitual: true,
      runMode: effectiveMode,
      dedicationTargetType: targetType,
      dedicationCustomName: customPersonName,
    });
    ritualService.markFirstRitualCompleted();
    onComplete({
      runMode: effectiveMode,
      dedicationTargetLabel: targetLabel,
    });
  };

  const goToNextStep = async () => {
    clearAutoAdvance();
    await persistCurrentStepSideEffects();

    if (isLastStep) {
      await finishRitual();
      return;
    }
    const nextIdx = stepIndex + 1;
    const nextStep = activeSteps[nextIdx];
    if (nextStep?.id === 'homage') setHomageDoneCount(0);
    if (nextStep?.id === 'pureMouth') setPureMouthDoneCount(0);
    setShowWhySheet(false);
    setStepIndex(nextIdx);
  };

  const goToPrevStep = () => {
    clearAutoAdvance();
    setShowWhySheet(false);
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    const prevIdx = stepIndex - 1;
    const prevStep = activeSteps[prevIdx];
    if (prevStep?.id === 'homage') setHomageDoneCount(0);
    if (prevStep?.id === 'pureMouth') setPureMouthDoneCount(0);
    setStepIndex(prevIdx);
  };

  const handleHomageTap = () => {
    if (homageDoneCount >= homageTargetReps) return;
    const nextCount = homageDoneCount + 1;
    setHomageDoneCount(nextCount);
    navigator.vibrate?.(8);
    playCompletionBell(volume <= 0 ? 0 : Math.max(0.45, volume));

    if (nextCount >= homageTargetReps) {
      clearAutoAdvance();
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        goToNextStep();
      }, 480);
    }
  };

  const handlePureMouthTap = () => {
    if (pureMouthDoneCount >= pureMouthTargetReps) return;
    const nextCount = pureMouthDoneCount + 1;
    setPureMouthDoneCount(nextCount);
    navigator.vibrate?.(8);
    playCompletionBell(volume <= 0 ? 0 : Math.max(0.4, volume));

    if (nextCount >= pureMouthTargetReps) {
      clearAutoAdvance();
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        goToNextStep();
      }, 480);
    }
  };

  const renderVerseWithRuby = (verse?: string, pinyin?: string) => {
    if (!verse) return null;
    const ruby = showPinyin ? alignParagraphToRuby(verse, pinyin) : null;
    return (
      <div className="max-w-lg mx-auto text-center">
        <p
          className="text-reading text-ink whitespace-pre-wrap text-center"
          style={{
            lineHeight: showPinyin && pinyin ? 2.45 : 2,
          }}
        >
          {ruby && ruby.aligned ? ruby.nodes : verse}
        </p>
        {showPinyin && ruby && !ruby.aligned && ruby.fallbackPinyin && (
          <p className="text-sm text-ink-2 mt-2 leading-relaxed font-sans">
            {ruby.fallbackPinyin}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-full bg-paper flex flex-col justify-between overflow-hidden select-none">
      {/* Ambient Breathing Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, var(--theme-accent-mist) 0%, transparent 68%)',
        }}
      />

      {/* Top Navigation & Progress Dots */}
      <header className="relative z-20 h-14 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={goToPrevStep}
          aria-label={stepIndex === 0 ? '返回' : '上一步'}
          className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        {/* Step Progress Dots */}
        <div
          className="flex items-center justify-center gap-1.5 sm:gap-2"
          aria-label={`第 ${stepIndex + 1} 步，共 ${activeSteps.length} 步`}
        >
          {activeSteps.map((st, idx) => {
            const isCurrent = idx === stepIndex;
            const isPassed = idx < stepIndex;
            return (
              <span
                key={st.id}
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

        {/* Right Controls: 直接开始 + 拼音 + 为什么 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearAutoAdvance();
              onDirectStart();
            }}
            className="px-2.5 min-h-[36px] rounded-full text-xs text-ink-3 hover:text-accent transition-colors whitespace-nowrap"
          >
            直接开始
          </button>

          {currentStep.verse && currentStep.pinyin && (
            <button
              type="button"
              onClick={() => setShowPinyin((v) => !v)}
              className={cn(
                'px-2.5 min-h-[34px] rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
                showPinyin
                  ? 'bg-accent-mist text-accent border-accent/40'
                  : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
              )}
              title="切换注音"
            >
              拼音
            </button>
          )}

          {showWhyTrigger && (
            <button
              type="button"
              onClick={() => setShowWhySheet(true)}
              className="inline-flex items-center gap-1 px-2.5 min-h-[34px] rounded-full text-xs font-medium text-ink-2 hover:text-accent hover:bg-surface-2 transition-colors whitespace-nowrap"
              title="为什么这样做"
            >
              <HelpCircle size={14} strokeWidth={1.6} />
              <span>为什么？</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Step Viewport (One Step Per Screen) */}
      <div className="relative z-10 flex-1 w-full overflow-y-auto px-6 py-3 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg mx-auto flex flex-col items-center text-center space-y-5 my-auto"
          >
            {/* Title & Scripture Kicker */}
            <div className="space-y-1.5">
              <p className="text-caption text-ink-3">
                {activeScripture.title} · 第 {stepIndex + 1} / {activeSteps.length} 步
              </p>
              <h2 className="text-display text-ink text-balance">
                {currentStep.title}
              </h2>
            </div>

            {/* Step 1: 调身调息 (Breathing Circle) */}
            {currentStep.id === 'breathing' && (
              <div className="w-full flex flex-col items-center space-y-5 py-1">
                <p className="text-sm sm:text-base text-ink-2 leading-relaxed max-w-md">
                  {currentStep.guidance}
                </p>

                <div className="relative flex flex-col items-center justify-center py-2">
                  <motion.div
                    animate={
                      breathingDone ? { scale: 1 } : { scale: [1, 1.15, 1] }
                    }
                    transition={
                      breathingDone
                        ? { duration: 0.5 }
                        : {
                            duration: 8,
                            times: [0, 0.5, 1],
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }
                    }
                    className="w-[156px] h-[156px] sm:w-[184px] sm:h-[184px] rounded-full opacity-90 flex items-center justify-center shadow-float"
                    style={{ background: 'var(--theme-gradient)' }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={breathingDone ? 'done' : breathPhase}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="text-title text-on-accent tracking-[0.2em] pl-[0.2em] drop-shadow-sm"
                      >
                        {breathingDone ? '安住' : breathPhase}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>

                  <p className="text-caption mt-4 tabular-nums">
                    {breathingDone
                      ? '三次深呼吸已完成，身心渐安'
                      : `深呼吸 · 第 ${breathCount} / 3 息（吸 4 秒 · 呼 4 秒）`}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: 礼佛 (Tap to Bow / Prostrate) */}
            {currentStep.id === 'homage' && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleHomageTap}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleHomageTap();
                  }
                }}
                className="w-full py-6 px-4 rounded-3xl bg-surface/65 border border-line/80 hover:border-accent/40 active:scale-[0.99] transition-all cursor-pointer flex flex-col items-center space-y-5"
              >
                <p className="text-reading text-ink leading-relaxed max-w-md">
                  {currentStep.guidance}
                </p>

                <p className="text-caption text-accent font-medium">
                  {homageTargetReps === 1
                    ? '合掌问讯一次 · 轻触此处完成'
                    : `至诚礼拜三拜 · 每拜轻触此处（${homageDoneCount} / 3）`}
                </p>

                <div className="flex items-center justify-center gap-3 pt-1">
                  {Array.from({ length: homageTargetReps }).map((_, i) => {
                    const filled = i < homageDoneCount;
                    return (
                      <span
                        key={i}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center',
                          filled
                            ? 'bg-accent border-accent scale-110'
                            : 'bg-surface border-line-strong'
                        )}
                      >
                        {filled && (
                          <span className="w-2 h-2 rounded-full bg-on-accent" />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: 净口业真言 (Multi-rep tap circles) */}
            {currentStep.id === 'pureMouth' && (
              <div
                role="button"
                tabIndex={0}
                onClick={handlePureMouthTap}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handlePureMouthTap();
                  }
                }}
                className="w-full py-5 px-4 rounded-3xl bg-surface/65 border border-line/80 hover:border-accent/40 active:scale-[0.99] transition-all cursor-pointer flex flex-col items-center space-y-5"
              >
                <p className="text-caption">{currentStep.guidance}</p>

                {renderVerseWithRuby(currentStep.verse, currentStep.pinyin)}

                <div className="flex flex-col items-center space-y-2.5 pt-1">
                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    {Array.from({ length: pureMouthTargetReps }).map((_, i) => {
                      const filled = i < pureMouthDoneCount;
                      return (
                        <span
                          key={i}
                          className={cn(
                            'w-5 h-5 rounded-full border-2 transition-all duration-200',
                            filled
                              ? 'bg-accent border-accent scale-110'
                              : 'bg-surface border-line-strong'
                          )}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-ink-3 tabular-nums">
                    每念完一遍轻点画面（{pureMouthDoneCount} / {pureMouthTargetReps} 遍）
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: 忏悔 (Verse + Optional Local-only Input) */}
            {currentStep.id === 'repentance' && (
              <div className="w-full space-y-5">
                <p className="text-caption">{currentStep.guidance}</p>
                {renderVerseWithRuby(currentStep.verse, currentStep.pinyin)}

                <div className="w-full text-left pt-2">
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    今天想忏悔的一件事（只存在本机，可选）
                  </label>
                  <textarea
                    value={confessionText}
                    onChange={(e) => setConfessionText(e.target.value)}
                    placeholder="填写后将加密存进「观心记录」，不上传云端，留空可直接下一步"
                    rows={2}
                    className="w-full rounded-2xl bg-surface border border-line px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 5: 发愿 (四弘誓愿 + 我的愿 + 这一座为谁而念) */}
            {currentStep.id === 'vow' && (
              <div className="w-full space-y-4">
                {renderVerseWithRuby(currentStep.verse, currentStep.pinyin)}

                {personalVow.trim() && (
                  <div className="px-4 py-3 rounded-2xl bg-accent-mist/60 border border-line text-center">
                    <p className="text-sm font-serif text-ink">
                      我的愿：{personalVow.trim()}
                    </p>
                  </div>
                )}

                <div className="w-full text-left space-y-2.5 pt-1">
                  <p className="text-xs font-medium text-ink-2 text-center">
                    这一座为谁而念（将带入结尾回向文）
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEDICATION_TARGET_OPTIONS.map((opt) => {
                      const selected = targetType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setTargetType((prev) =>
                              prev === opt.id ? null : opt.id
                            )
                          }
                          className={cn(
                            'min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                            selected
                              ? 'bg-accent text-on-accent border-accent'
                              : 'bg-surface text-ink-2 border-line hover:text-ink hover:border-line-strong'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {targetType === 'person' && (
                    <input
                      type="text"
                      value={customPersonName}
                      onChange={(e) => setCustomPersonName(e.target.value)}
                      placeholder="输入名字或称呼（只存本机）"
                      className="w-full h-11 rounded-xl bg-surface border border-line px-3.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Step 6: 开经偈 (经典类显示) */}
            {currentStep.id === 'openingSutra' && (
              <div className="w-full space-y-4">
                <p className="text-caption">{currentStep.guidance}</p>
                {renderVerseWithRuby(currentStep.verse, currentStep.pinyin)}
              </div>
            )}

            {/* Step 7: 念诵要点 */}
            {currentStep.id === 'chantingGuide' && (
              <div className="w-full space-y-4 text-left">
                <div className="rounded-2xl bg-surface border border-line divide-y divide-line">
                  {(currentStep.tips || []).map((tip, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 text-sm text-ink leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="text-accent font-serif mt-0.5 shrink-0">
                        ·
                      </span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* First-time auto-expanded "为什么" explanation */}
            {shouldAutoExpandWhy && (
              <div className="w-full rounded-2xl bg-surface-2/85 border border-line px-4 py-3 text-left space-y-1">
                <p className="text-xs font-medium text-accent flex items-center gap-1.5">
                  <Sparkles size={13} strokeWidth={1.6} />
                  <span>为什么这样做（首次引导展开）</span>
                </p>
                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                  {currentStep.why}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Primary CTA */}
      <footer className="relative z-20 px-6 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-w-lg w-full mx-auto shrink-0">
        <button
          type="button"
          onClick={goToNextStep}
          className={cn(
            'w-full h-12 rounded-full font-medium text-sm transition-colors shadow-float',
            currentStep.id === 'breathing' && !breathingDone
              ? 'bg-surface border border-line-strong text-ink hover:bg-surface-2'
              : 'bg-accent text-on-accent hover:bg-accent-hover'
          )}
        >
          {isLastStep
            ? '开始念诵'
            : currentStep.id === 'breathing' && !breathingDone
            ? '跳过调息 · 下一步'
            : '下一步'}
        </button>
      </footer>

      {/* 「为什么？」底部弹层 */}
      <AnimatePresence>
        {showWhySheet && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhySheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl rounded-t-3xl bg-surface border-t border-line shadow-float px-6 pt-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))] space-y-4"
            >
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto" />
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-title text-ink">
                  为什么：{currentStep.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowWhySheet(false)}
                  aria-label="关闭"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
                {currentStep.why}
              </p>
              <button
                type="button"
                onClick={() => setShowWhySheet(false)}
                className="w-full h-11 rounded-full bg-surface-2 text-ink text-sm font-medium hover:bg-line/50 transition-colors"
              >
                明白了
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
