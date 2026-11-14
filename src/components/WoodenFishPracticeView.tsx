import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Heart,
  Library,
  Metronome,
  Moon,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Scripture } from '../constants';
import {
  RITUAL_DEDICATION_DEFAULT_PINYIN,
  RITUAL_DEDICATION_DEFAULT_VERSE,
  RitualRunMode,
  formatSpecialDedicationLine,
} from '../data/ritual';
import { DailyPracticeItem } from '../types/practice';
import {
  getDefaultTargetForCategory,
  getDefaultUnitForCategory,
} from '../services/practiceService';
import {
  DailyRitualState,
  RitualSettings,
  ritualService,
} from '../services/ritualService';
import { alignParagraphToRuby } from '../utils/rubyPinyin';
import { RitualFlow } from './RitualFlow';
import { WoodenFish, WoodenFishHandle } from './WoodenFish';
import {
  DailyPracticeSettingsSheet,
  ScripturePickerSheet,
} from './WoodenFishSheets';
import { cn } from '../lib/utils';
import { safeStorage } from '../utils/safeStorage';
import { playCompletionBell } from '../utils/zenAudio';

export const FISH_DEDICATION_PRESETS = [
  {
    id: '1' as const,
    label: '普皆回向（默认）',
    text: RITUAL_DEDICATION_DEFAULT_VERSE,
  },
  {
    id: '2' as const,
    label: '无相回向',
    text: '所修善法，不着功德相，回向法界一切众生。',
  },
  {
    id: '3' as const,
    label: '慈心安乐',
    text: '愿我与家人、众生，身心安乐，离苦得乐。',
  },
];

export type FishDedicationChoice = '1' | '2' | '3' | 'custom';

export function resolveFishDedicationText(
  choice: FishDedicationChoice,
  customText: string
): string {
  if (choice === 'custom' && customText.trim()) {
    return customText.trim();
  }
  const found = FISH_DEDICATION_PRESETS.find((p) => p.id === choice);
  return found ? found.text : FISH_DEDICATION_PRESETS[0].text;
}

interface WoodenFishPracticeViewProps {
  activeScripture: Scripture;
  allScriptures: Scripture[];
  dailyPractice: DailyPracticeItem[];
  dailyCounts: Record<string, number>;
  recentScriptureIds: string[];
  goalType: 'count' | 'time';
  goalValue: number;
  unit: '遍' | '声';
  todayCount: number;
  sessionCount: number;
  isSessionActive: boolean;
  sessionStartTime: number | null;
  sessionTimeLeft: number | null;
  volume: number;
  soundType: 'standard' | 'crisp' | 'deep';
  onChangeVolume?: (volume: number) => void;
  onChangeSoundType?: (soundType: 'standard' | 'crisp' | 'deep') => void;
  appearance: 'fish' | 'lotus' | 'bowl';
  showMeritFloat: boolean;
  meritFloatText: string;
  dedicationText: string;
  personalVow?: string;
  autoOpenRitual?: boolean;
  onAutoOpenRitualConsumed?: () => void;
  theme: 'zen' | 'lotus' | 'sky' | 'dark';
  completionSignal: number;
  onSelectScripture: (scripture: Scripture) => void;
  onUpdateDailyPractice: (items: DailyPracticeItem[]) => void;
  onOpenLibrary: () => void;
  onOpenGoalModal?: () => void;
  onHit: () => void;
  onResetSession: () => void;
  onRecordSession: (
    dedicationText: string,
    unit: '遍' | '声',
    silent?: boolean,
    ritualMeta?: {
      ritualMode?: RitualRunMode;
      dedicationTarget?: string;
    }
  ) => void;
  onBack: () => void;
}

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

const BPM_OPTIONS: (40 | 60 | 80)[] = [40, 60, 80];

export const WoodenFishPracticeView: React.FC<WoodenFishPracticeViewProps> = ({
  activeScripture,
  allScriptures,
  dailyPractice,
  dailyCounts,
  recentScriptureIds,
  goalType,
  goalValue,
  unit,
  todayCount,
  sessionCount,
  isSessionActive,
  sessionStartTime,
  sessionTimeLeft,
  volume,
  soundType,
  onChangeVolume,
  onChangeSoundType,
  appearance,
  showMeritFloat,
  meritFloatText,
  dedicationText,
  personalVow = '',
  autoOpenRitual = false,
  onAutoOpenRitualConsumed,
  theme,
  completionSignal,
  onSelectScripture,
  onUpdateDailyPractice,
  onOpenLibrary,
  onHit,
  onResetSession,
  onRecordSession,
  onBack,
}) => {
  const fishRef = useRef<WoodenFishHandle>(null);
  const ringGradientId = useId().replace(/:/g, '');

  // Zen Hall Mode persisted choice
  const [zenHallMode, setZenHallMode] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('zen_hall_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      safeStorage.setItem('zen_hall_mode', String(zenHallMode));
    } catch {
      // ignore storage failure
    }
  }, [zenHallMode]);

  // Metronome guide (off by default)
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<40 | 60 | 80>(60);
  const [showMetronomePicker, setShowMetronomePicker] = useState<boolean>(false);

  // Volume / Mute quick control
  const [showVolumePicker, setShowVolumePicker] = useState<boolean>(false);
  const lastNonZeroVolumeRef = useRef<number>(volume > 0 ? volume : 0.8);
  useEffect(() => {
    if (volume > 0) {
      lastNonZeroVolumeRef.current = volume;
    }
  }, [volume]);

  // Sheets & Menus
  const [showScriptureSheet, setShowScriptureSheet] = useState<boolean>(false);
  const [showSheetPinyin, setShowSheetPinyin] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showScripturePicker, setShowScripturePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'select' | 'add'>('select');
  const [showPracticeSettings, setShowPracticeSettings] = useState<boolean>(false);
  const [settingsFocusScriptureId, setSettingsFocusScriptureId] = useState<string | null>(null);

  // Rhythm awareness caption
  const [showSlowHint, setShowSlowHint] = useState<boolean>(false);
  const slowHintTimerRef = useRef<number | null>(null);

  // Goal completion sequence: 800ms ring flash -> chime + dedication overlay
  const [ringFlashActive, setRingFlashActive] = useState<boolean>(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState<boolean>(false);
  const [isEarlyFinish, setIsEarlyFinish] = useState<boolean>(false);
  const lastProcessedSignalRef = useRef<number>(completionSignal);
  const earlyFinishTimerRef = useRef<number | null>(null);

  // Ritual state & settings (如法念诵仪轨)
  const [ritualSettings, setRitualSettings] = useState<RitualSettings>(() =>
    ritualService.getSettings()
  );
  const [dailyRitualState, setDailyRitualState] = useState<DailyRitualState>(() =>
    ritualService.getDailyState()
  );
  const [showRitualFlow, setShowRitualFlow] = useState<boolean>(false);
  const [closingHomageDone, setClosingHomageDone] = useState<number>(0);

  const totalTodayChanting = useMemo(
    () =>
      Object.values(dailyCounts).reduce(
        (sum, n) => sum + (typeof n === 'number' ? n : 0),
        0
      ),
    [dailyCounts]
  );

  const needsPreRitualGate =
    totalTodayChanting === 0 && !dailyRitualState.completedPreRitual;

  useEffect(() => {
    const syncRitualSettings = () =>
      setRitualSettings(ritualService.getSettings());
    const syncDailyRitual = () =>
      setDailyRitualState(ritualService.getDailyState());
    window.addEventListener('zen_ritual_settings_updated', syncRitualSettings);
    window.addEventListener('zen_daily_ritual_updated', syncDailyRitual);
    return () => {
      window.removeEventListener(
        'zen_ritual_settings_updated',
        syncRitualSettings
      );
      window.removeEventListener('zen_daily_ritual_updated', syncDailyRitual);
    };
  }, []);

  useEffect(() => {
    if (!autoOpenRitual) return;
    if (needsPreRitualGate) {
      setShowRitualFlow(true);
    }
    onAutoOpenRitualConsumed?.();
  }, [autoOpenRitual, needsPreRitualGate, onAutoOpenRitualConsumed]);

  useEffect(() => {
    if (showCompletionOverlay) {
      setClosingHomageDone(0);
    }
  }, [showCompletionOverlay]);

  useEffect(() => {
    return () => {
      if (earlyFinishTimerRef.current !== null) {
        window.clearTimeout(earlyFinishTimerRef.current);
      }
    };
  }, []);

  const handleDirectStart = () => {
    const next = ritualService.saveDailyState({
      completedPreRitual: true,
      runMode: 'direct',
    });
    setDailyRitualState(next);
    setShowRitualFlow(false);
  };

  const openEarlyDedication = () => {
    if (ringFlashActive) return;
    setIsEarlyFinish(true);
    setRingFlashActive(true);
    playCompletionBell(volume <= 0 ? 0 : Math.max(0.55, volume));
    if (earlyFinishTimerRef.current !== null) {
      window.clearTimeout(earlyFinishTimerRef.current);
    }
    earlyFinishTimerRef.current = window.setTimeout(() => {
      setRingFlashActive(false);
      setShowCompletionOverlay(true);
      earlyFinishTimerRef.current = null;
    }, 800);
  };

  // Horizontal swipe state & inline scroll ref in focal phrase area
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const inlineScriptureScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inlineScriptureScrollRef.current) {
      inlineScriptureScrollRef.current.scrollTop = 0;
    }
  }, [activeScripture.id]);

  // Live elapsed clock (updates every second during active session, pauses on completion overlay)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!isSessionActive || !sessionStartTime) {
      setElapsedSeconds(0);
      return;
    }
    if (showCompletionOverlay) {
      return;
    }
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [isSessionActive, sessionStartTime, showCompletionOverlay]);

  // 5s inactivity auto-dimming (everything except instrument fades to opacity 0.3)
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleTimerRef = useRef<number | null>(null);

  const hasOpenOverlay =
    showRitualFlow ||
    showScriptureSheet ||
    showMoreMenu ||
    showScripturePicker ||
    showPracticeSettings ||
    showCompletionOverlay ||
    showMetronomePicker ||
    showVolumePicker;

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (!hasOpenOverlay) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, 5000);
    }
  };

  useEffect(() => {
    resetIdleTimer();
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [hasOpenOverlay]);

  // Wake Lock API while inside WoodenFish view
  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null;
    let isCancelled = false;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        };
        if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
          const lock = await nav.wakeLock.request('screen');
          if (isCancelled) {
            lock.release().catch(() => {});
          } else {
            sentinel = lock;
          }
        }
      } catch {
        // Unsupported or battery-saver blocked — skip gracefully
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, []);

  // Trigger goal completion celebration (ring flash -> chime -> dedication overlay)
  useEffect(() => {
    if (completionSignal <= lastProcessedSignalRef.current) return;
    lastProcessedSignalRef.current = completionSignal;

    setIsEarlyFinish(false);
    setRingFlashActive(true);
    playCompletionBell(volume <= 0 ? 0 : Math.max(0.55, volume));

    const flashTimer = window.setTimeout(() => {
      setRingFlashActive(false);
      setShowCompletionOverlay(true);
    }, 800);

    return () => window.clearTimeout(flashTimer);
  }, [completionSignal, volume]);

  useEffect(() => {
    return () => {
      if (slowHintTimerRef.current !== null) {
        window.clearTimeout(slowHintTimerRef.current);
      }
    };
  }, []);

  const handleSlowPaceWarning = () => {
    setShowSlowHint(true);
    if (slowHintTimerRef.current !== null) {
      window.clearTimeout(slowHintTimerRef.current);
    }
    slowHintTimerRef.current = window.setTimeout(() => {
      setShowSlowHint(false);
    }, 2500);
  };

  // Formatted full text for inline scrollable reading (or short title for Buddha names)
  const isLongScripture = activeScripture.category !== 'name';
  const inlineScriptureText = useMemo(() => {
    if (!isLongScripture) {
      return activeScripture.title;
    }
    return activeScripture.content.trim() || activeScripture.title;
  }, [activeScripture, isLongScripture]);

  // Enabled daily practice list + active/next calculation
  const scriptureById = useMemo(() => {
    const map = new Map<string, Scripture>();
    allScriptures.forEach((s) => map.set(s.id, s));
    return map;
  }, [allScriptures]);

  const enabledDailyItems = useMemo(() => {
    return dailyPractice
      .filter((item) => item.enabled && scriptureById.has(item.scriptureId))
      .sort((a, b) => a.order - b.order);
  }, [dailyPractice, scriptureById]);

  const allDailyCompleted = useMemo(() => {
    if (enabledDailyItems.length === 0) return false;
    return enabledDailyItems.every(
      (item) => (dailyCounts[item.scriptureId] || 0) >= item.target
    );
  }, [enabledDailyItems, dailyCounts]);

  const nextUnfinishedItem = useMemo(() => {
    if (enabledDailyItems.length === 0) return null;
    const currentIdx = enabledDailyItems.findIndex(
      (item) => item.scriptureId === activeScripture.id
    );
    const ordered =
      currentIdx >= 0
        ? [
            ...enabledDailyItems.slice(currentIdx + 1),
            ...enabledDailyItems.slice(0, currentIdx),
          ]
        : enabledDailyItems;

    const candidate = ordered.find(
      (item) =>
        item.scriptureId !== activeScripture.id &&
        (dailyCounts[item.scriptureId] || 0) < item.target
    );
    if (!candidate) return null;
    const sc = scriptureById.get(candidate.scriptureId);
    if (!sc) return null;
    return {
      item: candidate,
      scripture: sc,
      doneCount: dailyCounts[candidate.scriptureId] || 0,
    };
  }, [enabledDailyItems, activeScripture.id, dailyCounts, scriptureById]);

  const switchToDailyScripture = (scripture: Scripture) => {
    if (scripture.id === activeScripture.id) return;
    navigator.vibrate?.(5);
    onSelectScripture(scripture);
  };

  const handleSwipeDaily = (direction: 'prev' | 'next') => {
    if (enabledDailyItems.length <= 1) return;
    const currentIdx = enabledDailyItems.findIndex(
      (item) => item.scriptureId === activeScripture.id
    );
    let nextIdx = 0;
    if (currentIdx === -1) {
      nextIdx = direction === 'next' ? 0 : enabledDailyItems.length - 1;
    } else {
      nextIdx =
        direction === 'next'
          ? (currentIdx + 1) % enabledDailyItems.length
          : (currentIdx - 1 + enabledDailyItems.length) %
            enabledDailyItems.length;
    }
    const targetItem = enabledDailyItems[nextIdx];
    const targetScripture = scriptureById.get(targetItem.scriptureId);
    if (targetScripture) {
      switchToDailyScripture(targetScripture);
    }
  };

  // Progress ratio [0..1] based strictly on current active round (resets cleanly after dedication/record)
  const safeGoalValue = Math.max(1, goalValue || 108);
  const progressRatio = useMemo(() => {
    if (ringFlashActive || showCompletionOverlay) return 1;
    if (goalType === 'time') {
      const totalSeconds = safeGoalValue * 60;
      if (!isSessionActive) return 0;
      if (sessionTimeLeft !== null) {
        return Math.min(1, Math.max(0, (totalSeconds - sessionTimeLeft) / totalSeconds));
      }
      return Math.min(1, elapsedSeconds / totalSeconds);
    }
    return Math.min(1, sessionCount / safeGoalValue);
  }, [
    ringFlashActive,
    showCompletionOverlay,
    goalType,
    safeGoalValue,
    isSessionActive,
    sessionTimeLeft,
    elapsedSeconds,
    sessionCount,
  ]);

  // Format mm:ss
  const displayClockSeconds =
    goalType === 'time' && isSessionActive && sessionTimeLeft !== null
      ? sessionTimeLeft
      : elapsedSeconds;

  const formattedClock = `${Math.floor(displayClockSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(displayClockSeconds % 60).toString().padStart(2, '0')}`;

  const goalLabel = goalType === 'time' ? `${safeGoalValue}分` : `${safeGoalValue} ${unit}`;

  // SVG Ring geometry (compact 148px diameter so WoodenFish sits noticeably higher)
  const ringSize = 148;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  const dimClass = isIdle && !hasOpenOverlay ? 'opacity-30' : 'opacity-100';

  const handleLowerHalfTap = () => {
    if (hasOpenOverlay || ringFlashActive) return;
    if (needsPreRitualGate) {
      setShowRitualFlow(true);
      return;
    }
    resetIdleTimer();
    fishRef.current?.triggerHit();
  };

  const handleLowerHalfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasOpenOverlay) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handleLowerHalfTap();
  };

  const dedicationTargetLabel = ritualService.resolveDedicationTargetLabel(
    dailyRitualState.dedicationTargetType,
    dailyRitualState.dedicationCustomName
  );
  const specialDedicationLine = formatSpecialDedicationLine(dedicationTargetLabel);
  const closingHomageReps =
    dailyRitualState.runMode === 'full' &&
    ritualSettings.homageStyle === 'prostrate3'
      ? 3
      : 1;
  const showClosingPinyin = useMemo(() => {
    try {
      const saved = safeStorage.getItem('zen_scripture_show_pinyin');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  }, [showCompletionOverlay]);
  const fullClosingDedication = specialDedicationLine
    ? `${dedicationText}\n${specialDedicationLine}`
    : dedicationText;

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none',
        theme === 'dark' && zenHallMode ? 'bg-[#080A09]' : 'bg-paper'
      )}
    >
      {/* Subtle 12s breathing ambient radial backdrop */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: zenHallMode ? [0.18, 0.34, 0.18] : [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 56%, var(--theme-accent-mist) 0%, transparent 68%)',
        }}
      />

      {/* Zen Hall extra 10% (or deeper in dark) darkening veil */}
      {zenHallMode && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none fixed inset-0 transition-opacity duration-500',
            theme === 'dark' ? 'bg-black/35' : 'bg-black/10'
          )}
        />
      )}

      {/* Top Toolbar */}
      <header
        className={cn(
          'relative z-20 h-12 sm:h-14 px-3 flex items-center justify-between shrink-0 transition-opacity duration-700',
          zenHallMode ? 'opacity-100' : dimClass
        )}
      >
        {/* Left: Back Button (40px circle) */}
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-surface-2 transition-all',
            zenHallMode ? 'opacity-30 hover:opacity-100' : 'opacity-100'
          )}
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        {/* Center: Clickable Scripture Name + ChevronDown */}
        {!zenHallMode ? (
          <button
            type="button"
            onClick={() => {
              setPickerMode('select');
              setShowScripturePicker(true);
            }}
            className="inline-flex items-center justify-center gap-1 text-caption font-medium text-ink-2 hover:text-accent max-w-[46vw] px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
            title="选择经文/佛号"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={activeScripture.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="truncate"
              >
                {activeScripture.title}
              </motion.span>
            </AnimatePresence>
            <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 text-ink-3" />
          </button>
        ) : (
          <span />
        )}

        {/* Right: 原文 + ⋯ + 节拍 + 禅堂模式 */}
        <div className="flex items-center gap-1 relative">
          {!zenHallMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowMetronomePicker(false);
                  setShowVolumePicker(false);
                  setShowScriptureSheet(true);
                }}
                aria-label="原文"
                title="经文原文"
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink-2 hover:text-accent hover:bg-surface-2 transition-colors"
              >
                <BookOpen size={18} strokeWidth={1.5} />
              </button>

              {/* ⋯ Menu right next to 原文 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMetronomePicker(false);
                    setShowVolumePicker(false);
                    setShowMoreMenu((v) => !v);
                  }}
                  aria-label="更多操作"
                  title="定课设置与更多"
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                    showMoreMenu
                      ? 'bg-accent-mist text-accent'
                      : 'text-ink-2 hover:text-accent hover:bg-surface-2'
                  )}
                >
                  <MoreHorizontal size={18} strokeWidth={1.5} />
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowMoreMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 top-11 z-40 w-44 rounded-2xl bg-surface border border-line shadow-float py-1.5 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowRitualFlow(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                        >
                          <Sparkles size={15} strokeWidth={1.5} className="text-accent" />
                          <span>如法念诵仪轨</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setSettingsFocusScriptureId(null);
                            setShowPracticeSettings(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                        >
                          <Target size={15} strokeWidth={1.5} className="text-accent" />
                          <span>定课设定</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setPickerMode('select');
                            setShowScripturePicker(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                        >
                          <BookOpen size={15} strokeWidth={1.5} className="text-accent" />
                          <span>切换经文 / 佛号</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onOpenLibrary();
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                        >
                          <Library size={15} strokeWidth={1.5} className="text-accent" />
                          <span>前往经文库</span>
                        </button>
                        <div className="my-1 border-t border-line" />
                        {sessionCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              openEarlyDedication();
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-accent hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                          >
                            <Heart size={15} strokeWidth={1.5} />
                            <span>提前结束并回向</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setMetronomeEnabled(false);
                            setRingFlashActive(false);
                            setShowCompletionOverlay(false);
                            setIsEarlyFinish(false);
                            onResetSession();
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink-2 hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                        >
                          <RotateCcw size={15} strokeWidth={1.5} />
                          <span>重置本次计数</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* 节拍引导 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowVolumePicker(false);
                    if (!metronomeEnabled) {
                      setMetronomeEnabled(true);
                      setShowMetronomePicker(true);
                    } else {
                      setShowMetronomePicker((v) => !v);
                    }
                  }}
                  aria-label="节拍引导"
                  title="节拍引导"
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                    metronomeEnabled
                      ? 'bg-accent-mist text-accent'
                      : 'text-ink-2 hover:text-accent hover:bg-surface-2'
                  )}
                >
                  {Metronome ? (
                    <Metronome size={18} strokeWidth={1.5} />
                  ) : (
                    <Activity size={18} strokeWidth={1.5} />
                  )}
                </button>

                <AnimatePresence>
                  {showMetronomePicker && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowMetronomePicker(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 top-11 z-40 w-48 rounded-2xl bg-surface border border-line shadow-float p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-ink">节拍引导</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMetronomeEnabled((v) => !v);
                              if (metronomeEnabled) setShowMetronomePicker(false);
                            }}
                            className={cn(
                              'text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors',
                              metronomeEnabled
                                ? 'bg-accent text-on-accent'
                                : 'bg-surface-2 text-ink-2'
                            )}
                          >
                            {metronomeEnabled ? '已开启' : '已关闭'}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {BPM_OPTIONS.map((bpm) => (
                            <button
                              key={bpm}
                              type="button"
                              onClick={() => {
                                setMetronomeBpm(bpm);
                                setMetronomeEnabled(true);
                                setShowMetronomePicker(false);
                              }}
                              className={cn(
                                'py-1.5 rounded-xl text-xs font-medium border transition-colors',
                                metronomeEnabled && metronomeBpm === bpm
                                  ? 'bg-accent-mist text-accent border-accent'
                                  : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                              )}
                            >
                              {bpm} 声
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-ink-3 leading-snug">
                          每分钟 {metronomeBpm} 声，随外圈柔光轻敲
                        </p>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {/* 声音与静音控制 */}
              {onChangeVolume && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowMetronomePicker(false);
                      setShowVolumePicker((v) => !v);
                    }}
                    aria-label={volume <= 0 ? '已静音（点击调音）' : '声音与静音'}
                    title={volume <= 0 ? '已静音（点击调音）' : '声音与静音'}
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                      showVolumePicker
                        ? 'bg-accent-mist text-accent'
                        : volume <= 0
                        ? 'bg-surface-2 text-ink-3 hover:text-ink'
                        : 'text-ink-2 hover:text-accent hover:bg-surface-2'
                    )}
                  >
                    {volume <= 0 ? (
                      <VolumeX size={18} strokeWidth={1.5} />
                    ) : (
                      <Volume2 size={18} strokeWidth={1.5} />
                    )}
                  </button>

                  <AnimatePresence>
                    {showVolumePicker && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setShowVolumePicker(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{ duration: 0.16 }}
                          className="absolute right-0 top-11 z-40 w-56 rounded-2xl bg-surface border border-line shadow-float p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-ink">木鱼声音</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (volume <= 0) {
                                  onChangeVolume(lastNonZeroVolumeRef.current || 0.8);
                                } else {
                                  onChangeVolume(0);
                                }
                              }}
                              className={cn(
                                'text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors',
                                volume <= 0
                                  ? 'bg-surface-2 text-ink-2 border border-line'
                                  : 'bg-accent-mist text-accent'
                              )}
                            >
                              {volume <= 0 ? '已静音 · 点击开启' : '一键静音'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <VolumeX size={14} className="text-ink-3 shrink-0" />
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.02}
                              value={volume}
                              aria-label="木鱼音量"
                              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                              className="w-full accent-[var(--theme-accent)] cursor-pointer"
                            />
                            <span className="text-[11px] text-ink-2 tabular-nums w-8 text-right shrink-0">
                              {Math.round(volume * 100)}%
                            </span>
                          </div>

                          {onChangeSoundType && (
                            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                              {[
                                { id: 'standard' as const, label: '标准' },
                                { id: 'crisp' as const, label: '清脆' },
                                { id: 'deep' as const, label: '深沉' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => onChangeSoundType(opt.id)}
                                  className={cn(
                                    'py-1.5 rounded-xl text-xs font-medium border transition-colors',
                                    soundType === opt.id
                                      ? 'bg-accent-mist text-accent border-accent'
                                      : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* 禅堂模式 */}
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false);
              setShowMetronomePicker(false);
              setShowVolumePicker(false);
              setZenHallMode((v) => !v);
            }}
            aria-label="禅堂模式"
            title={zenHallMode ? '退出禅堂模式' : '禅堂模式'}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all',
              zenHallMode
                ? 'bg-accent-mist/80 text-accent opacity-60 hover:opacity-100'
                : 'text-ink-2 hover:text-accent hover:bg-surface-2'
            )}
          >
            <Moon size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Upper 1/3 + Middle: Ritual Entry, Swipeable Verse & Goal Progress Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center px-5 pt-1 shrink-0 pointer-events-none">
        {!zenHallMode && (
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false);
              setShowMetronomePicker(false);
              setShowVolumePicker(false);
              setShowRitualFlow(true);
            }}
            className={cn(
              'pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300',
              dailyRitualState.completedPreRitual && dailyRitualState.runMode === 'full'
                ? 'bg-accent-mist/80 text-accent border-accent/25 hover:bg-accent-mist'
                : 'bg-surface/80 text-ink-2 border-line/80 hover:text-accent hover:border-accent/40',
              dimClass
            )}
            title="开启或查看如法念诵仪轨"
          >
            <Sparkles size={13} strokeWidth={1.6} className="text-accent shrink-0" />
            <span>如法念诵仪轨</span>
            {dailyRitualState.completedPreRitual && dailyRitualState.runMode === 'full' && (
              <span className="text-[10px] text-accent/80">· 已行仪轨</span>
            )}
          </button>
        )}

        {/* Upper Area: Inline Scrollable Scripture Text or Buddha Name (swipeable left/right across 我的定课) */}
        <div
          onPointerDown={(e) => {
            swipeStartXRef.current = e.clientX;
            swipeStartYRef.current = e.clientY;
          }}
          onPointerUp={(e) => {
            if (swipeStartXRef.current === null || swipeStartYRef.current === null) return;
            const dx = e.clientX - swipeStartXRef.current;
            const dy = e.clientY - swipeStartYRef.current;
            swipeStartXRef.current = null;
            swipeStartYRef.current = null;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
              handleSwipeDaily(dx < 0 ? 'next' : 'prev');
            }
          }}
          className={cn(
            'w-full flex flex-col items-center justify-center mb-1.5 transition-opacity duration-700 touch-pan-y',
            zenHallMode ? 'opacity-0 pointer-events-none' : cn('pointer-events-auto', dimClass)
          )}
        >
          {isLongScripture ? (
            <div className="w-full max-w-md mx-auto">
              <div
                ref={inlineScriptureScrollRef}
                className="max-h-[104px] sm:max-h-[126px] w-full overflow-y-auto overscroll-contain touch-pan-y px-4 py-2 rounded-2xl bg-surface/55 border border-line/60 select-text"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScripture.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-serif text-[15px] sm:text-[16px] leading-[1.85] text-ink text-center whitespace-pre-wrap break-words"
                  >
                    {inlineScriptureText}
                  </motion.div>
                </AnimatePresence>
              </div>
              {inlineScriptureText.length > 48 && (
                <p className="text-[11px] text-ink-3 text-center mt-1 pointer-events-none">
                  可上下滑动经文 · 左右滑动切经
                </p>
              )}
            </div>
          ) : (
            <div className="min-h-[38px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeScripture.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-title text-ink text-center max-w-[16em] break-words"
                >
                  {inlineScriptureText}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {/* Daily Practice Dots */}
          {enabledDailyItems.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-1">
              {enabledDailyItems.map((item) => {
                const sc = scriptureById.get(item.scriptureId);
                if (!sc) return null;
                const isCurrent = item.scriptureId === activeScripture.id;
                const isDone = (dailyCounts[item.scriptureId] || 0) >= item.target;

                return (
                  <button
                    key={item.scriptureId}
                    type="button"
                    aria-label={`切换到${sc.title}`}
                    title={sc.title}
                    onClick={() => switchToDailyScripture(sc)}
                    className="p-1 flex items-center justify-center focus:outline-none"
                  >
                    <span
                      className={cn(
                        'rounded-full transition-all duration-200 block',
                        isCurrent ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5',
                        isDone
                          ? 'bg-accent'
                          : isCurrent
                          ? 'bg-accent-soft ring-1 ring-accent'
                          : 'bg-line-strong'
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Middle: 220px SVG Progress Ring + Count & Stats */}
        <div
          className={cn(
            'relative flex items-center justify-center transition-opacity duration-700 pointer-events-none',
            zenHallMode ? 'opacity-30' : dimClass
          )}
          style={{ width: ringSize, height: ringSize }}
        >
          {/* Completion Glow Flash (800ms) */}
          <AnimatePresence>
            {ringFlashActive && (
              <motion.div
                initial={{ opacity: 0.2, scale: 0.96 }}
                animate={{ opacity: [0.2, 0.85, 0], scale: [0.96, 1.07, 1.12] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-full border-4 border-accent-soft pointer-events-none"
                style={{
                  boxShadow: '0 0 36px var(--theme-accent-soft)',
                }}
              />
            )}
          </AnimatePresence>

          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="-rotate-90"
          >
            <defs>
              <linearGradient id={ringGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--theme-accent-soft)" />
                <stop offset="55%" stopColor="var(--theme-accent)" />
                <stop offset="100%" stopColor="var(--theme-accent-hover)" />
              </linearGradient>
            </defs>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--theme-line)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={`url(#${ringGradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-dashoffset 280ms cubic-bezier(.22, 1, .36, 1)',
              }}
            />
          </svg>

          {/* Center Counter & Sub-caption (hidden in Zen Hall mode) */}
          {!zenHallMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
              <span className="text-counter !text-[40px] text-ink tabular-nums">{sessionCount}</span>
              <span className="text-[12px] text-ink-2 mt-1.5 tabular-nums">
                {sessionCount} / {goalLabel} · {formattedClock}
              </span>
              {todayCount > sessionCount && (
                <span className="text-[10px] text-ink-3 mt-0.5 tabular-nums">
                  今日已诵 {todayCount} {unit}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lower Tap Zone: Lifted higher into comfortable center-lower thumb reach */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`轻触敲击${activeScripture.title}`}
        onPointerDown={handleLowerHalfPointerDown}
        onClick={(e) => {
          // Pointer taps fire immediately on onPointerDown; keep detail === 0 for assistive/keyboard click
          if (e.detail === 0) {
            handleLowerHalfTap();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleLowerHalfTap();
          }
        }}
        className="relative z-10 -mt-5 pt-2 flex-1 w-full flex flex-col items-center justify-start cursor-pointer touch-manipulation focus:outline-none pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {/* Slow Pace Awareness Caption */}
        <div className="h-4 mb-0.5 flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {showSlowHint && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-caption text-ink-2"
              >
                慢一点，听清这一声。
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Generous transparent hit-target wrapper around Wooden Fish */}
        <div
          className="relative w-full max-w-[380px] min-w-[280px] px-10 py-3 sm:px-14 sm:py-5 rounded-full flex items-center justify-center touch-manipulation cursor-pointer"
        >
          {/* Instrument stays at full opacity even when rest of UI dims */}
          <WoodenFish
            ref={fishRef}
            onHit={onHit}
            floatingText={meritFloatText}
            showFloatingText={showMeritFloat && !zenHallMode}
            volume={volume}
            soundType={soundType}
            appearance={appearance}
            sizePx="min(46vw, 184px)"
            metronomeBpm={metronomeEnabled ? metronomeBpm : null}
            onSlowPaceWarning={handleSlowPaceWarning}
          />
        </div>

        {!zenHallMode && needsPreRitualGate && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-1 flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRitualFlow(true);
              }}
              className="h-10 px-6 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium shadow-float transition-colors"
            >
              开始
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDirectStart();
              }}
              className="px-2 py-2 text-xs text-ink-3 hover:text-accent transition-colors"
            >
              直接开始
            </button>
          </div>
        )}

        {!zenHallMode && !needsPreRitualGate && sessionCount === 0 && (
          <p
            className={cn(
              'text-caption mt-1 transition-opacity duration-700 pointer-events-none',
              dimClass
            )}
          >
            轻触木鱼及周围区域即可敲击
          </p>
        )}

        {!zenHallMode && sessionCount > 0 && (
          <button
            type="button"
            disabled={ringFlashActive}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openEarlyDedication();
            }}
            className={cn(
              'mt-1 px-4 py-1.5 rounded-full text-xs text-ink-2 hover:text-accent bg-surface/75 hover:bg-surface-2 border border-line/80 transition-all duration-300 disabled:opacity-60',
              dimClass
            )}
          >
            提前结束 · 回向
          </button>
        )}
      </div>

      {/* Scripture Original Text Bottom Sheet (原文) */}
      <AnimatePresence>
        {showScriptureSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScriptureSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-surface border-t border-line shadow-float flex flex-col max-h-[80dvh] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2 shrink-0" />

              {/* Sheet Header */}
              <div className="px-6 py-3 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-title text-ink truncate">{activeScripture.title}</h3>
                  {activeScripture.source && (
                    <p className="text-caption truncate">{activeScripture.source}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(activeScripture.pinyin || activeScripture.explanation) && (
                    <button
                      type="button"
                      onClick={() => setShowSheetPinyin((v) => !v)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                        showSheetPinyin
                          ? 'bg-accent-mist text-accent border-accent'
                          : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                      )}
                    >
                      {showSheetPinyin ? '隐藏注音' : '拼音 / 释义'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowScriptureSheet(false)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-2 text-ink-2 hover:text-ink transition-colors"
                  >
                    收起
                  </button>
                </div>
              </div>

              {/* Scrollable Scripture Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <p className="text-reading text-ink whitespace-pre-wrap text-center">
                  {activeScripture.content}
                </p>

                {showSheetPinyin && activeScripture.pinyin && (
                  <div className="pt-4 border-t border-line">
                    <p className="text-caption font-medium text-ink-3 mb-1.5 text-center">
                      诵读拼音
                    </p>
                    <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap text-center">
                      {activeScripture.pinyin}
                    </p>
                  </div>
                )}

                {showSheetPinyin && activeScripture.explanation && (
                  <div className="p-4 rounded-2xl bg-accent-mist/60 border border-line">
                    <p className="text-xs font-medium text-accent mb-1">简要解释</p>
                    <p className="text-sm text-ink-2 leading-relaxed">
                      {activeScripture.explanation}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scripture Picker Bottom Sheet (选择经文 / 加入定课) */}
      <ScripturePickerSheet
        isOpen={showScripturePicker}
        mode={pickerMode}
        activeScriptureId={activeScripture.id}
        allScriptures={allScriptures}
        dailyPractice={dailyPractice}
        dailyCounts={dailyCounts}
        recentIds={recentScriptureIds}
        onClose={() => {
          setShowScripturePicker(false);
          if (pickerMode === 'add') {
            setShowPracticeSettings(true);
          }
        }}
        onSelect={(scripture) => {
          if (pickerMode === 'add') {
            const exists = dailyPractice.some(
              (item) => item.scriptureId === scripture.id
            );
            if (!exists) {
              onUpdateDailyPractice([
                ...dailyPractice,
                {
                  scriptureId: scripture.id,
                  target: getDefaultTargetForCategory(scripture.category),
                  unit: getDefaultUnitForCategory(scripture.category),
                  order: dailyPractice.length,
                  enabled: true,
                },
              ]);
            }
            setShowScripturePicker(false);
            setSettingsFocusScriptureId(scripture.id);
            setShowPracticeSettings(true);
            return;
          }
          onSelectScripture(scripture);
          setShowScripturePicker(false);
        }}
        onLongPressScripture={(scripture) => {
          setShowScripturePicker(false);
          setSettingsFocusScriptureId(scripture.id);
          setShowPracticeSettings(true);
        }}
      />

      {/* Daily Practice Settings Bottom Sheet (定课设定) */}
      <DailyPracticeSettingsSheet
        isOpen={showPracticeSettings}
        focusScriptureId={settingsFocusScriptureId}
        allScriptures={allScriptures}
        dailyPractice={dailyPractice}
        onClose={() => {
          setShowPracticeSettings(false);
          setSettingsFocusScriptureId(null);
        }}
        onChangeDailyPractice={onUpdateDailyPractice}
        onOpenAddPicker={() => {
          setShowPracticeSettings(false);
          setPickerMode('add');
          setShowScripturePicker(true);
        }}
      />

      {/* Goal Completion Overlay: Next Unfinished / Final Dedication & Homage Closing */}
      <AnimatePresence>
        {showCompletionOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-md flex flex-col items-center justify-between px-6 py-10 pb-[calc(2rem+env(safe-area-inset-bottom))] overflow-y-auto"
          >
            <div className="text-center space-y-2 pt-2">
              {allDailyCompleted ? (
                <h2 className="text-display text-accent">今日定课圆满</h2>
              ) : isEarlyFinish ? (
                <h2 className="text-title text-accent">随缘圆满 · 功德回向</h2>
              ) : (
                <h2 className="text-title text-accent">
                  {nextUnfinishedItem ? '这一部已圆满' : '功德回向'}
                </h2>
              )}
              <p className="text-caption text-ink-3">
                {todayCount > sessionCount && sessionCount > 0
                  ? `${activeScripture.title} · 本次 ${sessionCount} ${unit}（今日累计 ${todayCount} / ${goalLabel}） · ${formattedClock}`
                  : `${activeScripture.title} · 本次 ${sessionCount > 0 ? sessionCount : todayCount} ${unit} · ${formattedClock}`}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center justify-center max-w-md text-center space-y-5 py-6"
            >
              {(() => {
                const isDefaultVerse =
                  dedicationText.trim() === RITUAL_DEDICATION_DEFAULT_VERSE;
                const ruby =
                  isDefaultVerse && showClosingPinyin
                    ? alignParagraphToRuby(
                        dedicationText,
                        RITUAL_DEDICATION_DEFAULT_PINYIN
                      )
                    : null;
                return (
                  <p
                    className="text-title text-ink whitespace-pre-wrap"
                    style={{
                      lineHeight: ruby && ruby.aligned ? 2.45 : 1.9,
                    }}
                  >
                    {ruby && ruby.aligned ? ruby.nodes : dedicationText}
                  </p>
                );
              })()}

              {specialDedicationLine && (
                <p className="text-sm font-serif text-accent leading-relaxed px-4 py-2.5 rounded-2xl bg-accent-mist/70 border border-line">
                  {specialDedicationLine}
                </p>
              )}

              {/* Final Homage (问讯或三拜) shown on final closing screen */}
              {(allDailyCompleted || isEarlyFinish || !nextUnfinishedItem) && (
                <button
                  type="button"
                  onClick={() => {
                    if (closingHomageDone >= closingHomageReps) return;
                    const next = closingHomageDone + 1;
                    setClosingHomageDone(next);
                    navigator.vibrate?.(8);
                    playCompletionBell(
                      volume <= 0 ? 0 : Math.max(0.45, volume)
                    );
                  }}
                  className={cn(
                    'w-full max-w-xs py-3.5 px-4 rounded-2xl border transition-all flex flex-col items-center space-y-2',
                    closingHomageDone >= closingHomageReps
                      ? 'bg-accent-mist/60 border-accent/40 text-accent'
                      : 'bg-surface border-line hover:border-accent/40 text-ink'
                  )}
                >
                  <span className="text-xs font-medium">
                    {closingHomageDone >= closingHomageReps
                      ? closingHomageReps === 1
                        ? '已合掌问讯'
                        : '已礼拜三拜'
                      : closingHomageReps === 1
                      ? '结束礼佛：合掌问讯一次（轻点完成）'
                      : `结束礼佛：礼拜三拜（轻点完成 ${closingHomageDone} / 3）`}
                  </span>
                  <span className="flex items-center justify-center gap-2.5">
                    {Array.from({ length: closingHomageReps }).map((_, i) => {
                      const filled = i < closingHomageDone;
                      return (
                        <span
                          key={i}
                          className={cn(
                            'w-5 h-5 rounded-full border-2 transition-all duration-200',
                            filled
                              ? 'bg-accent border-accent scale-110'
                              : 'bg-paper border-line-strong'
                          )}
                        />
                      );
                    })}
                  </span>
                </button>
              )}
            </motion.div>

            {!allDailyCompleted && !isEarlyFinish && nextUnfinishedItem ? (
              <div className="w-full max-w-sm space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    if (sessionCount > 0) {
                      onRecordSession(fullClosingDedication, unit, true, {
                        ritualMode: dailyRitualState.runMode || 'direct',
                        dedicationTarget: dedicationTargetLabel || undefined,
                      });
                    }
                    setShowCompletionOverlay(false);
                    setIsEarlyFinish(false);
                    setRingFlashActive(false);
                    setMetronomeEnabled(false);
                    onSelectScripture(nextUnfinishedItem.scripture);
                  }}
                  className="w-full h-12 px-4 rounded-full bg-accent text-on-accent font-medium hover:bg-accent-hover transition-colors shadow-float truncate"
                >
                  下一部：{nextUnfinishedItem.scripture.title}{' '}
                  {nextUnfinishedItem.doneCount} / {nextUnfinishedItem.item.target}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEarlyFinish(true)}
                  className="w-full h-12 rounded-full border border-line-strong text-ink-2 font-medium hover:bg-surface-2 transition-colors"
                >
                  先到此回向并记入愿簿
                </button>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-3 text-center">
                <button
                  type="button"
                  disabled={closingHomageDone < closingHomageReps}
                  onClick={() => {
                    setShowCompletionOverlay(false);
                    setIsEarlyFinish(false);
                    setRingFlashActive(false);
                    setMetronomeEnabled(false);
                    onRecordSession(fullClosingDedication, unit, false, {
                      ritualMode: dailyRitualState.runMode || 'direct',
                      dedicationTarget: dedicationTargetLabel || undefined,
                    });
                  }}
                  className={cn(
                    'w-full h-12 rounded-full font-medium transition-colors shadow-float',
                    closingHomageDone >= closingHomageReps
                      ? 'bg-accent text-on-accent hover:bg-accent-hover'
                      : 'bg-surface-2 text-ink-3 border border-line cursor-not-allowed'
                  )}
                >
                  {closingHomageDone >= closingHomageReps
                    ? isEarlyFinish && !allDailyCompleted
                      ? '记入愿簿并结束'
                      : '记入愿簿'
                    : '请先轻点上方完成结束礼佛'}
                </button>

                {isEarlyFinish && !allDailyCompleted && nextUnfinishedItem && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sessionCount > 0) {
                        onRecordSession(fullClosingDedication, unit, true, {
                          ritualMode: dailyRitualState.runMode || 'direct',
                          dedicationTarget: dedicationTargetLabel || undefined,
                        });
                      }
                      setShowCompletionOverlay(false);
                      setIsEarlyFinish(false);
                      setRingFlashActive(false);
                      setMetronomeEnabled(false);
                      onSelectScripture(nextUnfinishedItem.scripture);
                    }}
                    className="text-caption text-ink-2 hover:text-accent py-1 px-4 transition-colors truncate max-w-full"
                  >
                    或 切换下一部：{nextUnfinishedItem.scripture.title}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCompletionOverlay(false)}
                  className="text-caption text-ink-2 hover:text-ink py-1 px-4 transition-colors"
                >
                  {allDailyCompleted ? '继续安住' : '继续念诵'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-chanting Ritual Overlay (如法念诵仪轨) */}
      <RitualFlow
        isOpen={showRitualFlow}
        activeScripture={activeScripture}
        personalVow={personalVow}
        volume={volume}
        onComplete={() => {
          setDailyRitualState(ritualService.getDailyState());
          setRitualSettings(ritualService.getSettings());
          setShowRitualFlow(false);
        }}
        onDirectStart={handleDirectStart}
        onCancel={() => setShowRitualFlow(false)}
      />
    </div>
  );
};
