import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Heart,
  Library,
  Maximize2,
  Metronome,
  Moon,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Scripture } from '../constants';
import {
  RITUAL_DEDICATION_DEFAULT_PINYIN,
  RITUAL_DEDICATION_DEFAULT_VERSE,
  RitualRunMode,
  formatSpecialDedicationLine,
} from '../data/ritual';
import { DailyPracticeItem, MEDITATION_PRACTICE_ID } from '../types/practice';
import {
  getDefaultTargetForCategory,
  getDefaultUnitForCategory,
  isMeditationPracticeItem,
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
import { ConfirmSheet } from './ConfirmSheet';
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
  celebratedScriptures?: string[];
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
  todayPracticeRitualDone?: string;
  autoOpenRitual?: boolean;
  onAutoOpenRitualConsumed?: () => void;
  autoOpenPracticeSettings?: boolean;
  onAutoOpenPracticeSettingsConsumed?: () => void;
  theme: 'zen' | 'lotus' | 'sky' | 'dark';
  completionSignal: number;
  onSelectScripture: (scripture: Scripture) => void;
  onStartDailyMeditation?: (minutes: number) => void;
  onOpenEveningReview?: () => void;
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
  celebratedScriptures = [],
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
  todayPracticeRitualDone,
  autoOpenRitual = false,
  onAutoOpenRitualConsumed,
  autoOpenPracticeSettings = false,
  onAutoOpenPracticeSettingsConsumed,
  theme,
  completionSignal,
  onSelectScripture,
  onStartDailyMeditation,
  onOpenEveningReview,
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

  // Volume memory for unmute
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
  const [showSoundFocusSheet, setShowSoundFocusSheet] = useState<boolean>(false);
  const [showScripturePicker, setShowScripturePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'select' | 'add'>('select');
  const [showPracticeSettings, setShowPracticeSettings] = useState<boolean>(false);
  const [settingsFocusScriptureId, setSettingsFocusScriptureId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Back prompt banner when sessionCount > 0 (auto-dismiss & leave after 3s)
  const [showLeavePrompt, setShowLeavePrompt] = useState<boolean>(false);
  const leaveTimerRef = useRef<number | null>(null);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearLeaveTimer();
  }, []);

  // Rhythm awareness caption
  const [showSlowHint, setShowSlowHint] = useState<boolean>(false);
  const slowHintTimerRef = useRef<number | null>(null);

  // Goal completion sequence: 800ms ring flash -> chime + dedication overlay
  const [ringFlashActive, setRingFlashActive] = useState<boolean>(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState<boolean>(false);
  const [isEarlyFinish, setIsEarlyFinish] = useState<boolean>(false);
  const [lastDedicatedInfo, setLastDedicatedInfo] = useState<{
    count: number;
    scriptureId: string;
  } | null>(null);
  const lastProcessedSignalRef = useRef<number>(completionSignal);
  const earlyFinishTimerRef = useRef<number | null>(null);

  // Clear "just dedicated" note as soon as user starts a new sitting or switches scripture
  useEffect(() => {
    if (sessionCount > 0) {
      setLastDedicatedInfo(null);
    }
  }, [sessionCount]);

  useEffect(() => {
    setLastDedicatedInfo(null);
  }, [activeScripture.id]);

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

  const isRitualDoneToday = Boolean(
    dailyRitualState.completedPreRitual || todayPracticeRitualDone
  );

  const needsPreRitualGate = totalTodayChanting === 0 && !isRitualDoneToday;

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
    if (!autoOpenPracticeSettings) return;
    setShowPracticeSettings(true);
    onAutoOpenPracticeSettingsConsumed?.();
  }, [autoOpenPracticeSettings, onAutoOpenPracticeSettingsConsumed]);

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
    clearLeaveTimer();
    setShowLeavePrompt(false);
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

  const handleBackPress = () => {
    if (sessionCount > 0 && !showLeavePrompt) {
      setShowLeavePrompt(true);
      clearLeaveTimer();
      leaveTimerRef.current = window.setTimeout(() => {
        setShowLeavePrompt(false);
        leaveTimerRef.current = null;
        onBack();
      }, 3000);
      return;
    }
    clearLeaveTimer();
    setShowLeavePrompt(false);
    onBack();
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
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000))
      );
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
    showSoundFocusSheet ||
    showScripturePicker ||
    showPracticeSettings ||
    showCompletionOverlay ||
    showResetConfirm;

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

  // Formatted full text for inline scrollable reading
  const isLongScripture = activeScripture.category !== 'name';
  const inlineScriptureText = useMemo(() => {
    if (!isLongScripture) {
      return activeScripture.title;
    }
    return activeScripture.content.trim() || activeScripture.title;
  }, [activeScripture, isLongScripture]);

  // Enabled daily practice list (including meditation items)
  const scriptureById = useMemo(() => {
    const map = new Map<string, Scripture>();
    allScriptures.forEach((s) => map.set(s.id, s));
    return map;
  }, [allScriptures]);

  const enabledDailyItems = useMemo(() => {
    return dailyPractice
      .filter(
        (item) =>
          item.enabled &&
          (isMeditationPracticeItem(item) || scriptureById.has(item.scriptureId))
      )
      .sort((a, b) => a.order - b.order);
  }, [dailyPractice, scriptureById]);

  const isDailyItemDone = (item: DailyPracticeItem) => {
    if (isMeditationPracticeItem(item)) {
      return celebratedScriptures.includes(MEDITATION_PRACTICE_ID);
    }
    return (
      celebratedScriptures.includes(item.scriptureId) ||
      (dailyCounts[item.scriptureId] || 0) >= item.target
    );
  };

  const allDailyCompleted = useMemo(() => {
    if (enabledDailyItems.length === 0) return false;
    return enabledDailyItems.every(isDailyItemDone);
  }, [enabledDailyItems, dailyCounts, celebratedScriptures]);

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
        item.scriptureId !== activeScripture.id && !isDailyItemDone(item)
    );
    if (!candidate) return null;

    if (isMeditationPracticeItem(candidate)) {
      const mins = candidate.minutes || candidate.target || 15;
      return {
        item: candidate,
        isMeditation: true as const,
        meditationMinutes: mins,
        scripture: undefined,
        doneCount: 0,
      };
    }

    const sc = scriptureById.get(candidate.scriptureId);
    if (!sc) return null;
    return {
      item: candidate,
      isMeditation: false as const,
      meditationMinutes: 0,
      scripture: sc,
      doneCount: dailyCounts[candidate.scriptureId] || 0,
    };
  }, [
    enabledDailyItems,
    activeScripture.id,
    dailyCounts,
    celebratedScriptures,
    scriptureById,
  ]);

  const switchToDailyScripture = (scripture: Scripture) => {
    if (scripture.id === activeScripture.id) return;
    navigator.vibrate?.(5);
    onSelectScripture(scripture);
  };

  const handleSwipeDaily = (direction: 'prev' | 'next') => {
    const chantOnly = enabledDailyItems.filter(
      (item) => !isMeditationPracticeItem(item)
    );
    if (chantOnly.length <= 1) return;
    const currentIdx = chantOnly.findIndex(
      (item) => item.scriptureId === activeScripture.id
    );
    let nextIdx = 0;
    if (currentIdx === -1) {
      nextIdx = direction === 'next' ? 0 : chantOnly.length - 1;
    } else {
      nextIdx =
        direction === 'next'
          ? (currentIdx + 1) % chantOnly.length
          : (currentIdx - 1 + chantOnly.length) % chantOnly.length;
    }
    const targetItem = chantOnly[nextIdx];
    const targetScripture = scriptureById.get(targetItem.scriptureId);
    if (targetScripture) {
      switchToDailyScripture(targetScripture);
    }
  };

  // Progress ratio [0..1] based on todayCount vs goalValue (for count mode)
  const safeGoalValue = Math.max(1, goalValue || 108);
  const isTodayGoalReached =
    goalType === 'count' && todayCount >= safeGoalValue;
  const extraTodayCount = Math.max(0, todayCount - safeGoalValue);

  const progressRatio = useMemo(() => {
    if (ringFlashActive || showCompletionOverlay) return 1;
    if (goalType === 'time') {
      const totalSeconds = safeGoalValue * 60;
      if (!isSessionActive) return 0;
      if (sessionTimeLeft !== null) {
        return Math.min(
          1,
          Math.max(0, (totalSeconds - sessionTimeLeft) / totalSeconds)
        );
      }
      return Math.min(1, elapsedSeconds / totalSeconds);
    }
    return Math.min(1, todayCount / safeGoalValue);
  }, [
    ringFlashActive,
    showCompletionOverlay,
    goalType,
    safeGoalValue,
    isSessionActive,
    sessionTimeLeft,
    elapsedSeconds,
    todayCount,
  ]);

  // Format mm:ss
  const displayClockSeconds =
    goalType === 'time' && isSessionActive && sessionTimeLeft !== null
      ? sessionTimeLeft
      : elapsedSeconds;

  const formattedClock = `${Math.floor(displayClockSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(displayClockSeconds % 60).toString().padStart(2, '0')}`;

  const goalLabel =
    goalType === 'time' ? `${safeGoalValue} 分` : `${safeGoalValue} ${unit}`;

  // Normalized 200x200 SVG ring around instrument (strokeWidth=3 with non-scaling-stroke)
  const svgRadius = 96;
  const svgCircumference = 2 * Math.PI * svgRadius;
  const svgDashOffset = svgCircumference * (1 - progressRatio);

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

  const currentHour = new Date().getHours();
  const isEveningWindow = currentHour >= 18 || currentHour < 4;

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
            'radial-gradient(circle at 50% 62%, var(--theme-accent-mist) 0%, transparent 68%)',
        }}
      />

      {/* Zen Hall extra darkening veil */}
      {zenHallMode && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none fixed inset-0 transition-opacity duration-500',
            theme === 'dark' ? 'bg-black/35' : 'bg-black/10'
          )}
        />
      )}

      {/* Top Toolbar: strictly 3 controls — Left「返回」, Center「经名 ▾」, Right「⋯」 */}
      <header
        className={cn(
          'relative z-20 h-12 px-3 flex items-center justify-between shrink-0 transition-opacity duration-700',
          zenHallMode ? 'opacity-100' : dimClass
        )}
      >
        {/* 1. Left: Back Button */}
        <button
          type="button"
          onClick={handleBackPress}
          aria-label="返回"
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-surface-2 transition-all',
            zenHallMode ? 'opacity-35 hover:opacity-100' : 'opacity-100'
          )}
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        {/* 2. Center: Clickable Scripture Name + ChevronDown */}
        {!zenHallMode ? (
          <button
            type="button"
            onClick={() => {
              setPickerMode('select');
              setShowScripturePicker(true);
            }}
            className="inline-flex items-center justify-center gap-1 text-caption font-medium text-ink-2 hover:text-accent max-w-[54vw] px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
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
          <button
            type="button"
            onClick={() => setZenHallMode(false)}
            className="px-3 py-1 rounded-full text-[11px] text-ink-3/60 hover:text-ink-2 transition-colors"
          >
            禅堂模式 · 轻点退出
          </button>
        )}

        {/* 3. Right: ⋯ Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="更多操作"
            title="声音、定课与更多"
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
              showMoreMenu
                ? 'bg-accent-mist text-accent'
                : zenHallMode
                ? 'text-ink-3 opacity-35 hover:opacity-100 hover:bg-surface-2'
                : 'text-ink-2 hover:text-accent hover:bg-surface-2'
            )}
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
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
                  className="absolute right-0 top-11 z-40 w-48 rounded-2xl bg-surface border border-line shadow-float py-1.5 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowSoundFocusSheet(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  >
                    {volume <= 0 ? (
                      <VolumeX size={15} strokeWidth={1.5} className="text-ink-3" />
                    ) : (
                      <Volume2 size={15} strokeWidth={1.5} className="text-accent" />
                    )}
                    <span>声音与专注</span>
                  </button>

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
                      setShowResetConfirm(true);
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
      </header>

      {/* Upper Area: Optional Pre-Ritual Tag (hidden once done today) + Scripture Box + Dots + Counter */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-5 pt-0.5 shrink-0 pointer-events-none">
        {!zenHallMode && !isRitualDoneToday && (
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false);
              setShowRitualFlow(true);
            }}
            className={cn(
              'pointer-events-auto mb-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-surface/80 text-ink-2 border-line/80 hover:text-accent hover:border-accent/40 transition-all duration-300',
              dimClass
            )}
          >
            <Sparkles size={13} strokeWidth={1.6} className="text-accent shrink-0" />
            <span>如法念诵仪轨</span>
          </button>
        )}

        {/* Inline Scrollable Scripture Text + Bottom-Right「展开全文」 */}
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
            'w-full flex flex-col items-center justify-center transition-opacity duration-700 touch-pan-y',
            zenHallMode ? 'opacity-0 pointer-events-none' : cn('pointer-events-auto', dimClass)
          )}
        >
          {isLongScripture ? (
            <div className="relative w-full max-w-md mx-auto">
              <div
                ref={inlineScriptureScrollRef}
                className="max-h-[clamp(72px,14dvh,140px)] w-full overflow-y-auto overscroll-contain touch-pan-y px-4 pt-2 pb-6 rounded-2xl bg-surface/60 border border-line/70 select-text"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScripture.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-serif text-[15px] sm:text-[16px] leading-[1.8] text-ink text-center whitespace-pre-wrap break-words"
                  >
                    {inlineScriptureText}
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptureSheet(true)}
                className="absolute right-2 bottom-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface/90 border border-line text-[11px] text-ink-2 hover:text-accent transition-colors"
              >
                <Maximize2 size={11} strokeWidth={1.5} />
                <span>展开全文</span>
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-md mx-auto min-h-[42px] flex items-center justify-center px-14">
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
              <button
                type="button"
                onClick={() => setShowScriptureSheet(true)}
                className="absolute right-1 bottom-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface/80 border border-line text-[11px] text-ink-3 hover:text-accent transition-colors"
              >
                <span>原文</span>
              </button>
            </div>
          )}

          {/* Daily Practice Dots */}
          {enabledDailyItems.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {enabledDailyItems.map((item) => {
                const isMed = isMeditationPracticeItem(item);
                const sc = isMed ? undefined : scriptureById.get(item.scriptureId);
                if (!isMed && !sc) return null;

                const isCurrent = !isMed && item.scriptureId === activeScripture.id;
                const isDone = isDailyItemDone(item);
                const label = isMed
                  ? `静坐 ${item.minutes || item.target || 15} 分钟`
                  : sc!.title;

                return (
                  <button
                    key={item.scriptureId}
                    type="button"
                    aria-label={`切换到${label}`}
                    title={label}
                    onClick={() => {
                      if (isMed) {
                        onStartDailyMeditation?.(item.minutes || item.target || 15);
                      } else if (sc) {
                        switchToDailyScripture(sc);
                      }
                    }}
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

        {/* Counter Block between Scripture Box and Wooden Fish (centered, tabular-nums) */}
        {!zenHallMode && (
          <div
            className={cn(
              'mt-1 sm:mt-1.5 flex flex-col items-center text-center transition-opacity duration-700',
              dimClass
            )}
          >
            <span
              className="text-counter text-ink tabular-nums leading-none"
              style={{ fontSize: 'clamp(44px, 8dvh, 56px)' }}
            >
              {sessionCount}
            </span>
            <span className="text-caption mt-1 tabular-nums">
              {sessionCount === 0 &&
              lastDedicatedInfo &&
              lastDedicatedInfo.scriptureId === activeScripture.id
                ? isTodayGoalReached
                  ? `刚刚已回向 ${lastDedicatedInfo.count} ${unit} · 今日已圆满（累计 ${todayCount} ${unit}）`
                  : `刚刚已回向 ${lastDedicatedInfo.count} ${unit} · 今日累计 ${todayCount} / ${goalLabel}`
                : isTodayGoalReached
                ? `今日已圆满 · 累计 ${todayCount} ${unit} · ${formattedClock}`
                : `今日累计 ${todayCount} / ${goalLabel} · ${formattedClock}`}
            </span>
          </div>
        )}
      </div>

      {/* Lower Tap Zone: Instrument wrapped directly inside 3px Progress Ring + Metronome Halo */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`轻触敲击${activeScripture.title}`}
        onPointerDown={handleLowerHalfPointerDown}
        onClick={(e) => {
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
        className="relative z-10 flex-1 w-full flex flex-col items-center justify-center cursor-pointer touch-manipulation focus:outline-none pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        {/* Slow Pace Awareness Caption */}
        <div className="h-4 mb-1 flex items-center justify-center pointer-events-none">
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

        {/* Instrument + Wrapping 3px Progress Ring (size = min(60vw, 34dvh), ring = size + 28px) */}
        <div
          className="relative flex items-center justify-center touch-manipulation cursor-pointer"
          style={{
            width: 'calc(min(60vw, 34dvh) + 28px)',
            height: 'calc(min(60vw, 34dvh) + 28px)',
          }}
        >
          {/* Metronome pulse halo around outer ring */}
          {metronomeEnabled && (
            <motion.div
              aria-hidden="true"
              animate={{
                scale: [1, 1.07, 1],
                opacity: [0.22, 0.62, 0.22],
              }}
              transition={{
                duration: 60 / metronomeBpm,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full border-2 border-accent-soft pointer-events-none"
            />
          )}

          {/* Completion Glow Flash (800ms) */}
          <AnimatePresence>
            {ringFlashActive && (
              <motion.div
                initial={{ opacity: 0.2, scale: 0.96 }}
                animate={{ opacity: [0.2, 0.85, 0], scale: [0.96, 1.06, 1.1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-full border-4 border-accent-soft pointer-events-none"
                style={{
                  boxShadow: '0 0 36px var(--theme-accent-soft)',
                }}
              />
            )}
          </AnimatePresence>

          {/* 3px SVG Progress Ring around the instrument */}
          <svg
            viewBox="0 0 200 200"
            className={cn(
              'absolute inset-0 w-full h-full -rotate-90 pointer-events-none transition-opacity duration-700',
              zenHallMode ? 'opacity-30' : dimClass
            )}
          >
            <defs>
              <linearGradient
                id={ringGradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="var(--theme-accent-soft)" />
                <stop offset="55%" stopColor="var(--theme-accent)" />
                <stop offset="100%" stopColor="var(--theme-accent-hover)" />
              </linearGradient>
            </defs>
            <circle
              cx={100}
              cy={100}
              r={svgRadius}
              fill="none"
              stroke="var(--theme-line)"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={100}
              cy={100}
              r={svgRadius}
              fill="none"
              stroke={
                isTodayGoalReached
                  ? 'var(--theme-accent-soft)'
                  : `url(#${ringGradientId})`
              }
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeDasharray={svgCircumference}
              strokeDashoffset={svgDashOffset}
              style={{
                transition:
                  'stroke-dashoffset 280ms cubic-bezier(.22, 1, .36, 1)',
              }}
            />
          </svg>

          {/* Instrument stays full opacity */}
          <div className="relative z-10 flex items-center justify-center">
            <WoodenFish
              ref={fishRef}
              onHit={onHit}
              floatingText={meritFloatText}
              showFloatingText={showMeritFloat && !zenHallMode}
              volume={volume}
              soundType={soundType}
              appearance={appearance}
              sizePx="min(60vw, 34dvh)"
              metronomeBpm={null}
              onSlowPaceWarning={handleSlowPaceWarning}
            />
          </div>
        </div>

        {/* Pre-Ritual inline prompt or subtle tap hint (NO early-finish button inside tap zone!) */}
        {!zenHallMode && needsPreRitualGate && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-2 flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRitualFlow(true);
              }}
              className="h-10 px-6 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium shadow-float transition-colors"
            >
              开始仪轨
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
              'text-caption mt-2 transition-opacity duration-700 pointer-events-none',
              dimClass
            )}
          >
            轻触木鱼及周围区域即可敲击
          </p>
        )}
      </div>

      {/* Bottom-left 36px quick speaker shortcut (outside tap propagation) */}
      {!zenHallMode && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowSoundFocusSheet(true);
          }}
          aria-label={volume <= 0 ? '声音与专注（当前已静音）' : '声音与专注'}
          title="声音与专注"
          className={cn(
            'fixed left-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 w-9 h-9 rounded-full bg-surface/85 border border-line flex items-center justify-center transition-all hover:border-accent/40',
            volume <= 0 ? 'text-ink-3' : 'text-ink-2 hover:text-accent',
            dimClass
          )}
        >
          {volume <= 0 ? (
            <VolumeX size={16} strokeWidth={1.5} />
          ) : (
            <Volume2 size={16} strokeWidth={1.5} />
          )}
        </button>
      )}

      {/* 3s Back Confirmation Bar when sessionCount > 0 */}
      <AnimatePresence>
        {showLeavePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface border border-line-strong shadow-float px-4 py-3 flex items-center justify-between gap-2"
          >
            <span className="text-xs text-ink font-medium truncate">
              要回向后再离开吗？
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openEarlyDedication()}
                className="px-3 h-8 rounded-full bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                回向
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLeaveTimer();
                  setShowLeavePrompt(false);
                  onBack();
                }}
                className="px-3 h-8 rounded-full bg-surface-2 text-ink-2 text-xs hover:text-ink transition-colors"
              >
                直接离开
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 「声音与专注」Bottom Sheet */}
      <AnimatePresence>
        {showSoundFocusSheet && (
          <div className="fixed inset-0 z-[75] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSoundFocusSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl rounded-t-3xl bg-surface border-t border-line shadow-float p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5"
            >
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto -mt-1" />

              <div className="flex items-center justify-between">
                <h3 className="text-title text-ink">声音与专注</h3>
                <button
                  type="button"
                  onClick={() => setShowSoundFocusSheet(false)}
                  aria-label="关闭"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* 音量与静音 */}
              {onChangeVolume && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">敲击音量</span>
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
                        'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                        volume <= 0
                          ? 'bg-surface-2 text-ink-2 border border-line'
                          : 'bg-accent-mist text-accent'
                      )}
                    >
                      {volume <= 0 ? '已静音 · 点击开启' : '一键静音'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <VolumeX size={16} className="text-ink-3 shrink-0" />
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
                    <span className="text-xs text-ink-2 tabular-nums w-9 text-right shrink-0">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* 音色 */}
              {onChangeSoundType && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-ink block">木鱼音色</span>
                  <div className="grid grid-cols-3 gap-2">
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
                          'h-10 rounded-xl text-xs font-medium border transition-colors',
                          soundType === opt.id
                            ? 'bg-accent-mist text-accent border-accent'
                            : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 节拍引导 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink flex items-center gap-2">
                    {Metronome ? (
                      <Metronome size={16} strokeWidth={1.5} className="text-accent" />
                    ) : (
                      <Activity size={16} strokeWidth={1.5} className="text-accent" />
                    )}
                    <span>节拍引导</span>
                  </span>
                  <span className="text-caption">
                    {metronomeEnabled
                      ? `每分钟 ${metronomeBpm} 声，外圈柔光随节拍脉动`
                      : '关闭中'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetronomeEnabled(false)}
                    className={cn(
                      'h-10 rounded-xl text-xs font-medium border transition-colors',
                      !metronomeEnabled
                        ? 'bg-accent-mist text-accent border-accent'
                        : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                    )}
                  >
                    关闭
                  </button>
                  {BPM_OPTIONS.map((bpm) => (
                    <button
                      key={bpm}
                      type="button"
                      onClick={() => {
                        setMetronomeBpm(bpm);
                        setMetronomeEnabled(true);
                      }}
                      className={cn(
                        'h-10 rounded-xl text-xs font-medium border transition-colors',
                        metronomeEnabled && metronomeBpm === bpm
                          ? 'bg-accent-mist text-accent border-accent'
                          : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                      )}
                    >
                      {bpm} 声
                    </button>
                  ))}
                </div>
              </div>

              {/* 禅堂模式 */}
              <button
                type="button"
                onClick={() => setZenHallMode((v) => !v)}
                className="w-full p-3.5 rounded-2xl bg-surface-2 border border-line flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Moon size={18} strokeWidth={1.5} className="text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-ink">禅堂专注模式</p>
                    <p className="text-caption">隐去经文与数字，仅留木鱼静心</p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative shrink-0 block',
                    zenHallMode ? 'bg-accent' : 'bg-line-strong'
                  )}
                >
                  <span
                    className={cn(
                      'block w-5 h-5 mt-0.5 rounded-full bg-surface shadow-sm transition-transform duration-200',
                      zenHallMode ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    )}
                  />
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scripture Original Text Bottom Sheet (原文全文) */}
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
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2 shrink-0" />

              <div className="px-6 py-3 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-title text-ink truncate">
                    {activeScripture.title}
                  </h3>
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

      {/* Scripture Picker Bottom Sheet */}
      <ScripturePickerSheet
        isOpen={showScripturePicker}
        mode={pickerMode}
        activeScriptureId={activeScripture.id}
        allScriptures={allScriptures}
        dailyPractice={dailyPractice}
        dailyCounts={dailyCounts}
        celebratedScriptures={celebratedScriptures}
        recentIds={recentScriptureIds}
        onClose={() => {
          setShowScripturePicker(false);
          if (pickerMode === 'add') {
            setShowPracticeSettings(true);
          }
        }}
        onSelectMeditation={(mins) => {
          setShowScripturePicker(false);
          onStartDailyMeditation?.(mins);
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

      {/* Daily Practice Settings Bottom Sheet */}
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

      {/* Reset Current Session ConfirmSheet */}
      <ConfirmSheet
        isOpen={showResetConfirm}
        title="重置本次计数？"
        description={`将把本次计数（+${sessionCount}）与计时归零。你今日已累计的 ${todayCount} ${unit} 不会被清除。`}
        confirmLabel="重置本次计数"
        onConfirm={() => {
          setShowResetConfirm(false);
          setMetronomeEnabled(false);
          setRingFlashActive(false);
          setShowCompletionOverlay(false);
          setIsEarlyFinish(false);
          onResetSession();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Goal Completion Overlay: Next Unfinished (including Meditation) / Final Dedication */}
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
                  : `${activeScripture.title} · 本次 ${
                      sessionCount > 0 ? sessionCount : todayCount
                    } ${unit} · ${formattedClock}`}
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
                    if (nextUnfinishedItem.isMeditation) {
                      onStartDailyMeditation?.(
                        nextUnfinishedItem.meditationMinutes
                      );
                    } else if (nextUnfinishedItem.scripture) {
                      onSelectScripture(nextUnfinishedItem.scripture);
                    }
                  }}
                  className="w-full h-12 px-4 rounded-full bg-accent text-on-accent font-medium hover:bg-accent-hover transition-colors shadow-float truncate"
                >
                  {nextUnfinishedItem.isMeditation
                    ? `下一项：静坐 ${nextUnfinishedItem.meditationMinutes} 分钟`
                    : `下一部：${nextUnfinishedItem.scripture?.title} ${nextUnfinishedItem.doneCount} / ${nextUnfinishedItem.item.target}`}
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
                    const countToRecord = sessionCount > 0 ? sessionCount : todayCount;
                    setShowCompletionOverlay(false);
                    setIsEarlyFinish(false);
                    setRingFlashActive(false);
                    setMetronomeEnabled(false);
                    if (countToRecord > 0) {
                      setLastDedicatedInfo({
                        count: countToRecord,
                        scriptureId: activeScripture.id,
                      });
                    }
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

                {allDailyCompleted && isEveningWindow && onOpenEveningReview && (
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
                      onOpenEveningReview();
                    }}
                    className="w-full h-12 rounded-full border border-accent/40 bg-accent-mist text-accent font-medium hover:bg-accent hover:text-on-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <Moon size={16} strokeWidth={1.5} />
                    <span>接着做晚课</span>
                  </button>
                )}

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
                      if (nextUnfinishedItem.isMeditation) {
                        onStartDailyMeditation?.(
                          nextUnfinishedItem.meditationMinutes
                        );
                      } else if (nextUnfinishedItem.scripture) {
                        onSelectScripture(nextUnfinishedItem.scripture);
                      }
                    }}
                    className="text-caption text-ink-2 hover:text-accent py-1 px-4 transition-colors truncate max-w-full"
                  >
                    {nextUnfinishedItem.isMeditation
                      ? `或 下一项：静坐 ${nextUnfinishedItem.meditationMinutes} 分钟`
                      : `或 切换下一部：${nextUnfinishedItem.scripture?.title}`}
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
