import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpDown,
  Bell,
  Check,
  Clock,
  CloudRain,
  Droplets,
  Edit2,
  Eye,
  EyeOff,
  FileAudio,
  Link as LinkIcon,
  Music,
  Pause,
  Play,
  SortAsc,
  Square,
  Trash2,
  Upload,
  Volume2,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { practiceService } from '../services/practiceService';
import { audioStreamService } from '../services/audioStreamService';
import {
  AmbientSoundType,
  MeditationReminderTone,
  playBreathChime,
  playMeditationCue,
  startAmbientSound,
  stopAmbientSound,
  updateAmbientVolume,
} from '../utils/zenAudio';

export type MeditationMood = '散乱' | '微乱' | '平常' | '安定' | '清明';
export type MeditationIntervalReminder = 'off' | '5' | '10' | 'half';

interface MeditationSoundPrefs {
  ambientId: AmbientSoundType | null;
  reminderTone: MeditationReminderTone;
  startEndBell: boolean;
  intervalReminder: MeditationIntervalReminder;
  breathCueEnabled: boolean;
  vibrateOnComplete: boolean;
  volume: number;
}

const SOUND_PREFS_STORAGE_KEY = 'zen_meditation_sound_prefs';

const DEFAULT_SOUND_PREFS: MeditationSoundPrefs = {
  ambientId: null,
  reminderTone: 'bell',
  startEndBell: true,
  intervalReminder: 'off',
  breathCueEnabled: false,
  vibrateOnComplete: true,
  volume: 0.7,
};

function loadSoundPrefs(): MeditationSoundPrefs {
  try {
    const raw = localStorage.getItem(SOUND_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_PREFS;
    const parsed = JSON.parse(raw);
    return {
      ambientId:
        parsed.ambientId === 'wind' ||
        parsed.ambientId === 'rain' ||
        parsed.ambientId === 'stream' ||
        parsed.ambientId === 'drone'
          ? parsed.ambientId
          : null,
      reminderTone:
        parsed.reminderTone === 'bell' ||
        parsed.reminderTone === 'bowl' ||
        parsed.reminderTone === 'chime' ||
        parsed.reminderTone === 'wood' ||
        parsed.reminderTone === 'none'
          ? parsed.reminderTone
          : 'bell',
      startEndBell:
        typeof parsed.startEndBell === 'boolean' ? parsed.startEndBell : true,
      intervalReminder:
        parsed.intervalReminder === '5' ||
        parsed.intervalReminder === '10' ||
        parsed.intervalReminder === 'half' ||
        parsed.intervalReminder === 'off'
          ? parsed.intervalReminder
          : 'off',
      breathCueEnabled:
        typeof parsed.breathCueEnabled === 'boolean' ? parsed.breathCueEnabled : false,
      vibrateOnComplete:
        typeof parsed.vibrateOnComplete === 'boolean' ? parsed.vibrateOnComplete : true,
      volume:
        typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
          ? Math.max(0, Math.min(1, parsed.volume))
          : 0.7,
    };
  } catch {
    return DEFAULT_SOUND_PREFS;
  }
}

const AMBIENT_SOUNDS: {
  id: AmbientSoundType;
  title: string;
  subtitle: string;
}[] = [
  { id: 'wind', title: '松林微风', subtitle: '轻柔山风拂过林梢，舒缓心绪' },
  { id: 'rain', title: '松涧细雨', subtitle: '绵密温和的林间细雨声' },
  { id: 'stream', title: '山涧清泉', subtitle: '低缓流动的溪水白噪音' },
  { id: 'drone', title: '古刹禅鸣', subtitle: '温暖低频的泛音余韵' },
];

const REMINDER_TONE_OPTIONS: {
  id: MeditationReminderTone;
  label: string;
}[] = [
  { id: 'bell', label: '铜磬' },
  { id: 'bowl', label: '颂钵' },
  { id: 'chime', label: '引磬' },
  { id: 'wood', label: '木鱼' },
  { id: 'none', label: '静音' },
];

const INTERVAL_REMINDER_OPTIONS: {
  id: MeditationIntervalReminder;
  label: string;
}[] = [
  { id: 'off', label: '不提醒' },
  { id: '5', label: '每 5 分' },
  { id: '10', label: '每 10 分' },
  { id: 'half', label: '半程' },
];

const MOOD_OPTIONS: { label: MeditationMood; color: string }[] = [
  { label: '散乱', color: 'var(--theme-line-strong)' },
  {
    label: '微乱',
    color: 'color-mix(in srgb, var(--theme-line-strong) 68%, var(--theme-accent) 32%)',
  },
  {
    label: '平常',
    color: 'color-mix(in srgb, var(--theme-line-strong) 38%, var(--theme-accent) 62%)',
  },
  { label: '安定', color: 'var(--theme-accent-soft)' },
  { label: '清明', color: 'var(--theme-accent)' },
];

const DURATION_PRESETS = [5, 10, 15, 20, 30];

interface MeditationProps {
  presetDuration?: number | null;
  onPresetConsumed?: () => void;
  onFinish?: (session: {
    duration: number;
    trackTitle: string;
    dedication: string;
    vow: string;
    mood?: MeditationMood;
  }) => void;
  onImmersiveChange?: (immersive: boolean) => void;
}

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

export const Meditation: React.FC<MeditationProps> = ({
  presetDuration,
  onPresetConsumed,
  onFinish,
  onImmersiveChange,
}) => {
  const { t } = useTranslation();

  // Phase: idle (before sitting), active (immersive meditation), complete (mindfulness mood check)
  const [phase, setPhase] = useState<'idle' | 'active' | 'complete'>('idle');
  const [isPaused, setIsPaused] = useState(false);

  // Duration & timer
  const [selectedDuration, setSelectedDuration] = useState<number>(
    presetDuration && presetDuration > 0 ? presetDuration : 15
  );
  const [showCustomDuration, setShowCustomDuration] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('25');
  const [timeLeft, setTimeLeft] = useState<number>(
    (presetDuration && presetDuration > 0 ? presetDuration : 15) * 60
  );
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [breathPhase, setBreathPhase] = useState<'吸' | '呼'>('吸');

  useEffect(() => {
    if (presetDuration && presetDuration > 0) {
      setSelectedDuration(presetDuration);
      setTimeLeft(presetDuration * 60);
      setShowCustomDuration(false);
      setPhase('idle');
      onPresetConsumed?.();
    }
  }, [presetDuration, onPresetConsumed]);

  // In-session controls visibility (hidden by default; tap screen reveals for 3s)
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [showTimer, setShowTimer] = useState<boolean>(true);
  const controlsHideTimerRef = useRef<number | null>(null);

  // Post-session mood selector
  const [selectedMood, setSelectedMood] = useState<MeditationMood | undefined>(undefined);

  // Sound bottom sheet, ambient & reminder prefs
  const initialSoundPrefs = React.useMemo(() => loadSoundPrefs(), []);
  const [showSoundSheet, setShowSoundSheet] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [selectedAmbientId, setSelectedAmbientId] = useState<AmbientSoundType | null>(
    initialSoundPrefs.ambientId
  );
  const [previewingAmbientId, setPreviewingAmbientId] = useState<AmbientSoundType | null>(null);
  const [reminderTone, setReminderTone] = useState<MeditationReminderTone>(
    initialSoundPrefs.reminderTone
  );
  const [startEndBell, setStartEndBell] = useState<boolean>(initialSoundPrefs.startEndBell);
  const [intervalReminder, setIntervalReminder] = useState<MeditationIntervalReminder>(
    initialSoundPrefs.intervalReminder
  );
  const [breathCueEnabled, setBreathCueEnabled] = useState<boolean>(
    initialSoundPrefs.breathCueEnabled
  );
  const [vibrateOnComplete, setVibrateOnComplete] = useState<boolean>(
    initialSoundPrefs.vibrateOnComplete
  );
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [firestoreTracks, setFirestoreTracks] = useState<any[]>([]);
  const [lastSavedProgress, setLastSavedProgress] = useState<
    Record<string, { currentTime: number; timeLeft: number }>
  >({});
  const [volume, setVolume] = useState<number>(initialSoundPrefs.volume);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'name'>('newest');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [importUrl, setImportUrl] = useState<string>('');
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  const previewTimerRef = useRef<number | null>(null);
  const soundPrefsRef = useRef({
    reminderTone,
    startEndBell,
    intervalReminder,
    breathCueEnabled,
    vibrateOnComplete,
    volume,
  });

  useEffect(() => {
    soundPrefsRef.current = {
      reminderTone,
      startEndBell,
      intervalReminder,
      breathCueEnabled,
      vibrateOnComplete,
      volume,
    };
    try {
      localStorage.setItem(
        SOUND_PREFS_STORAGE_KEY,
        JSON.stringify({
          ambientId: selectedAmbientId,
          reminderTone,
          startEndBell,
          intervalReminder,
          breathCueEnabled,
          vibrateOnComplete,
          volume,
        } satisfies MeditationSoundPrefs)
      );
    } catch {
      // ignore storage errors
    }
  }, [
    selectedAmbientId,
    reminderTone,
    startEndBell,
    intervalReminder,
    breathCueEnabled,
    vibrateOnComplete,
    volume,
  ]);

  const DB_NAME = 'ZenMeditationDB';
  const STORE_NAME = 'tracks';

  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const saveTrackToDB = async (track: any, blob: Blob) => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ ...track, blob });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  };

  const loadTracksFromDB = async () => {
    const database = await initDB();
    return new Promise<any[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const tracks = (request.result || []).map((item: any) => ({
          ...item,
          url: item.blob ? URL.createObjectURL(item.blob) : item.url,
        }));
        resolve(tracks);
      };
      request.onerror = () => reject(request.error);
    });
  };

  const deleteTrackFromDB = async (id: string) => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  };

  useEffect(() => {
    loadTracksFromDB()
      .then((tracks) => {
        setLocalTracks(tracks);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'audioResources'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setFirestoreTracks(
            snapshot.docs.map((docItem) => ({
              id: docItem.id,
              ...docItem.data(),
              url: docItem.data().audioUrl,
              isUrl: true,
            }))
          );
        },
        (error) => {
          console.warn('Firestore audioResources snapshot notice:', error);
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to audioResources:', err);
    }
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('meditation_progress');
    if (saved) {
      try {
        setLastSavedProgress(JSON.parse(saved));
      } catch {
        // ignore invalid saved json
      }
    }
  }, []);

  // Sync immersive state cleanly
  useEffect(() => {
    onImmersiveChange?.(phase === 'active');
    return () => {
      onImmersiveChange?.(false);
    };
  }, [phase, onImmersiveChange]);

  // Wake Lock during active meditation
  useEffect(() => {
    if (phase !== 'active') {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        };
        if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
          const lock = await nav.wakeLock.request('screen');
          if (cancelled) {
            lock.release().catch(() => {});
          } else {
            wakeLockRef.current = lock;
          }
        }
      } catch {
        // ignore unsupported/blocked wakeLock
      }
    };

    requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [phase]);

  // 4s inhale / 4s exhale breath cue synchronized with 8s circle breathing
  useEffect(() => {
    if (phase !== 'active' || isPaused) {
      setBreathPhase('吸');
      return;
    }
    setBreathPhase('吸');
    const interval = window.setInterval(() => {
      setBreathPhase((prev) => {
        const next: '吸' | '呼' = prev === '吸' ? '呼' : '吸';
        const prefs = soundPrefsRef.current;
        if (prefs.breathCueEnabled && prefs.volume > 0) {
          playBreathChime(
            Math.max(0.1, prefs.volume * 0.32),
            next === '吸' ? 'inhale' : 'exhale'
          );
        }
        return next;
      });
    }, 4000);
    return () => window.clearInterval(interval);
  }, [phase, isPaused]);

  // Drift-proof meditation countdown timer + interval reminder cues
  useEffect(() => {
    if (phase !== 'active' || isPaused) {
      endTimeRef.current = null;
      return;
    }

    endTimeRef.current = Date.now() + timeLeft * 1000;
    const totalSec = selectedDuration * 60;

    const interval = window.setInterval(() => {
      if (!endTimeRef.current) return;
      const diff = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(diff);

      const prefs = soundPrefsRef.current;
      const elapsedSec = totalSec - diff;
      if (diff > 15 && prefs.reminderTone !== 'none' && prefs.volume > 0) {
        if (prefs.intervalReminder === '5' || prefs.intervalReminder === '10') {
          const stepSec = prefs.intervalReminder === '5' ? 300 : 600;
          const milestone = Math.floor(elapsedSec / stepSec);
          if (milestone > 0 && milestone > lastMilestoneRef.current) {
            lastMilestoneRef.current = milestone;
            playMeditationCue(prefs.reminderTone, Math.max(0.25, prefs.volume * 0.85), false);
          }
        } else if (prefs.intervalReminder === 'half' && totalSec >= 120) {
          const halfPoint = Math.floor(totalSec / 2);
          if (elapsedSec >= halfPoint && lastMilestoneRef.current === 0) {
            lastMilestoneRef.current = 1;
            playMeditationCue(prefs.reminderTone, Math.max(0.25, prefs.volume * 0.85), false);
          }
        }
      }

      if (diff <= 0) {
        window.clearInterval(interval);
        endTimeRef.current = null;
        if (audioRef.current) audioRef.current.pause();
        stopAmbientSound();

        if (prefs.startEndBell && prefs.reminderTone !== 'none') {
          playMeditationCue(prefs.reminderTone, Math.max(0.35, prefs.volume), true);
        }

        if (prefs.vibrateOnComplete && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate([140, 90, 140]);
          } catch {
            // ignore unsupported vibrate
          }
        }

        if (prefs.vibrateOnComplete) {
          try {
            if (window.Notification && Notification.permission === 'granted') {
              new Notification(t('meditation_completed'), {
                body: t('meditation_title'),
              });
            }
          } catch {
            // ignore
          }
        }

        try {
          practiceService.updateActivity('meditation', selectedDuration);
          practiceService.logMerit('meditation');
        } catch {
          // ignore
        }

        setSessionDuration(selectedDuration);
        setSelectedMood(undefined);
        setPhase('complete');
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [phase, isPaused, selectedDuration, t]);

  // Keep audio & built-in ambient volume synced
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    updateAmbientVolume(volume);
  }, [volume]);

  // Built-in Web Audio ambient playback during active session or idle sheet preview
  useEffect(() => {
    if (phase === 'active' && !isPaused && selectedAmbientId && !currentTrack) {
      startAmbientSound(selectedAmbientId, volume);
    } else if (phase === 'idle' && showSoundSheet && previewingAmbientId) {
      startAmbientSound(previewingAmbientId, volume);
    } else {
      stopAmbientSound();
    }
  }, [phase, isPaused, selectedAmbientId, currentTrack, showSoundSheet, previewingAmbientId, volume]);

  useEffect(() => {
    if (!showSoundSheet) {
      setPreviewingAmbientId(null);
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    }
  }, [showSoundSheet]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    let mounted = true;
    const syncAudio = async () => {
      try {
        if (phase === 'active' && !isPaused) {
          setAudioError(null);
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (err: any) {
        if (mounted && phase === 'active' && !isPaused && err?.name !== 'AbortError') {
          setAudioError(
            err?.name === 'NotAllowedError'
              ? t('click_to_play' as any)
              : t('play_failed' as any) + (err?.message || '')
          );
        }
      }
    };
    syncAudio();

    return () => {
      mounted = false;
    };
  }, [phase, isPaused, currentTrack, t]);

  useEffect(() => {
    return () => {
      stopAmbientSound();
      if (controlsHideTimerRef.current !== null) {
        window.clearTimeout(controlsHideTimerRef.current);
      }
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  const revealControlsTemporarily = () => {
    setControlsVisible(true);
    if (controlsHideTimerRef.current !== null) {
      window.clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  const handleStartSitting = () => {
    if (
      vibrateOnComplete &&
      window.Notification &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission().catch(() => {});
    }

    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPreviewingAmbientId(null);
    lastMilestoneRef.current = 0;

    const totalSeconds = selectedDuration * 60;
    setTimeLeft(totalSeconds);
    sessionStartRef.current = Date.now();
    setIsPaused(false);
    setControlsVisible(false);
    setShowTimer(true);
    setAudioError(null);
    if (startEndBell && reminderTone !== 'none') {
      playMeditationCue(reminderTone, Math.max(0.35, volume), false);
    }
    setPhase('active');
  };

  const handleManualEndSession = () => {
    if (audioRef.current) audioRef.current.pause();
    stopAmbientSound();
    if (startEndBell && reminderTone !== 'none') {
      playMeditationCue(reminderTone, Math.max(0.3, volume * 0.85), false);
    }

    const elapsedMinutes = sessionStartRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
      : selectedDuration;
    const recordedMins = Math.min(selectedDuration, elapsedMinutes);

    try {
      practiceService.updateActivity('meditation', recordedMins);
      practiceService.logMerit('meditation');
    } catch {
      // ignore
    }

    setSessionDuration(recordedMins);
    setSelectedMood(undefined);
    setPhase('complete');
  };

  const activeAmbientMeta = selectedAmbientId
    ? AMBIENT_SOUNDS.find((a) => a.id === selectedAmbientId) || null
    : null;
  const activeSoundTitle = currentTrack?.title || activeAmbientMeta?.title || '静音静坐';

  const handleSaveToVowBook = () => {
    practiceService.updateActivity('dedication', true);

    let dedication = t('default_meditation_dedication');
    try {
      const dList = JSON.parse(localStorage.getItem('zen_meditation_dedications') || '[]');
      if (Array.isArray(dList)) {
        dedication = dList.find((d: any) => d?.isDefault)?.content || dedication;
      }
    } catch {
      // ignore
    }

    let vow = '愿以此禅修功德，回向法界众生，身心清净，福慧增长。';
    try {
      const vList = JSON.parse(localStorage.getItem('zen_vows') || '[]');
      if (Array.isArray(vList)) {
        vow = vList.find((v: any) => v?.isDefault)?.content || vow;
      }
    } catch {
      // ignore
    }

    onFinish?.({
      duration: sessionDuration,
      trackTitle: activeSoundTitle,
      dedication,
      vow,
      mood: selectedMood,
    });

    toast.success('已记入愿簿');
    sessionStartRef.current = null;
    endTimeRef.current = null;
    lastMilestoneRef.current = 0;
    setIsPaused(false);
    setSelectedMood(undefined);
    setPhase('idle');
    setTimeLeft(selectedDuration * 60);
  };

  const saveTrackProgress = (trackId: string, currentTime: number, remaining: number) => {
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000) return;
    lastSaveTimeRef.current = now;
    const nextProgress = {
      ...lastSavedProgress,
      [trackId]: { currentTime, timeLeft: remaining },
    };
    setLastSavedProgress(nextProgress);
    localStorage.setItem('meditation_progress', JSON.stringify(nextProgress));
  };

  const allTracks = [...firestoreTracks, ...localTracks].sort((a, b) => {
    if (sortOrder === 'name') {
      return String(a?.title || '').localeCompare(String(b?.title || ''));
    }
    return String(b?.id || '').localeCompare(String(a?.id || ''));
  });

  const selectTrack = (track: any | null) => {
    setCurrentTrack(track);
    if (track) {
      setSelectedAmbientId(null);
      setPreviewingAmbientId(null);
    }
    setAudioError(null);
    if (!track) {
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setIsLoadingAudio(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    if (track.url) {
      audioStreamService
        .getCachedAudioUrl(track.url)
        .then((streamUrl) => {
          setCurrentTrack((prev: any) =>
            prev?.id === track.id ? { ...prev, streamUrl } : prev
          );
        })
        .catch(() => {});
    }

    setIsLoadingAudio(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const selectAmbient = (ambientId: AmbientSoundType | null, previewInIdle = true) => {
    setCurrentTrack(null);
    if (audioRef.current) audioRef.current.pause();
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setIsLoadingAudio(false);
    setAudioError(null);
    setSelectedAmbientId(ambientId);

    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (phase === 'idle' && ambientId && previewInIdle) {
      setPreviewingAmbientId(ambientId);
      previewTimerRef.current = window.setTimeout(() => {
        setPreviewingAmbientId(null);
        previewTimerRef.current = null;
      }, 4500);
    } else {
      setPreviewingAmbientId(null);
    }
  };

  const toggleAmbientPreview = (ambientId: AmbientSoundType) => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewingAmbientId === ambientId) {
      setPreviewingAmbientId(null);
    } else {
      setPreviewingAmbientId(ambientId);
      previewTimerRef.current = window.setTimeout(() => {
        setPreviewingAmbientId(null);
        previewTimerRef.current = null;
      }, 6000);
    }
  };

  const reminderToneLabel =
    REMINDER_TONE_OPTIONS.find((item) => item.id === reminderTone)?.label || '铜磬';
  const intervalLabel =
    intervalReminder === '5'
      ? '每5分'
      : intervalReminder === '10'
      ? '每10分'
      : intervalReminder === 'half'
      ? '半程'
      : '';
  const hasAnyReminder =
    reminderTone !== 'none' &&
    (startEndBell || intervalReminder !== 'off' || breathCueEnabled);
  const reminderSummary = hasAnyReminder
    ? [reminderToneLabel, intervalLabel, breathCueEnabled ? '呼吸音' : '']
        .filter(Boolean)
        .join('·')
    : '无提醒音';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setAudioError(t('invalid_audio'));
      return;
    }

    const url = URL.createObjectURL(file);
    const newTrack = {
      id: `local-${file.name}-${file.size}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: t('local_upload'),
      url,
      duration: t('unknown_duration'),
      isLocal: true,
    };

    try {
      await saveTrackToDB(newTrack, file);
    } catch (err) {
      console.error('Failed to save track to DB', err);
    }

    setLocalTracks((prev) =>
      prev.find((tr) => tr.id === newTrack.id) ? prev : [newTrack, ...prev]
    );
    selectTrack(newTrack);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeTrack = async (trackId: string) => {
    const target = localTracks.find((tr) => tr.id === trackId);
    if (target?.url) {
      URL.revokeObjectURL(target.url);
    }
    try {
      await deleteTrackFromDB(trackId);
    } catch (err) {
      console.error('Failed to delete track from DB', err);
    }

    setLocalTracks((prev) => prev.filter((tr) => tr.id !== trackId));
    if (String(currentTrack?.id) === String(trackId)) {
      selectTrack(null);
    }

    const nextProgress = { ...lastSavedProgress };
    delete nextProgress[trackId];
    setLastSavedProgress(nextProgress);
    localStorage.setItem('meditation_progress', JSON.stringify(nextProgress));
  };

  const renameTrack = async (trackId: string, title: string) => {
    if (!title.trim()) return;
    const track = localTracks.find((tr) => tr.id === trackId);
    if (!track) return;

    const updated = { ...track, title: title.trim() };
    setLocalTracks((prev) => prev.map((tr) => (tr.id === trackId ? updated : tr)));
    if (currentTrack?.id === trackId) {
      setCurrentTrack(updated);
    }

    try {
      const database = await initDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => {
        const data = req.result;
        if (data) {
          data.title = title.trim();
          store.put(data);
        }
      };
    } catch (err) {
      console.error('Failed to rename track in DB', err);
    }
    setRenamingId(null);
  };

  const fixGoogleDriveUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    const fixedUrl = fixGoogleDriveUrl(importUrl.trim());
    const newTrack = {
      id: `url-${Date.now()}`,
      title: `${t('import_audio')} ${new Date().toLocaleTimeString()}`,
      description: t('network_import'),
      url: fixedUrl,
      duration: t('unknown_duration'),
      isLocal: true,
      isUrl: true,
    };

    try {
      const database = await initDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(newTrack);
    } catch (err) {
      console.error('Failed to save URL track to DB', err);
    }

    setLocalTracks((prev) => [newTrack, ...prev]);
    selectTrack(newTrack);
    setImportUrl('');
    setShowUrlInput(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDurationSelect = (mins: number) => {
    setSelectedDuration(mins);
    setShowCustomDuration(false);
    setTimeLeft(mins * 60);
  };

  const handleApplyCustomDuration = () => {
    const parsed = parseInt(customMinutesInput, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      const clamped = Math.min(180, Math.max(1, parsed));
      setSelectedDuration(clamped);
      setTimeLeft(clamped * 60);
      setShowCustomDuration(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Hidden Audio Element (supports background music or URL/local uploads) */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.streamUrl || currentTrack.url}
          loop={isLooping}
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current && currentTrack) {
              setAudioCurrentTime(audioRef.current.currentTime);
              if (phase === 'active' && !isPaused) {
                saveTrackProgress(
                  currentTrack.id,
                  audioRef.current.currentTime,
                  timeLeft
                );
              }
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
            }
          }}
          onLoadStart={() => setIsLoadingAudio(true)}
          onCanPlay={() => {
            setAudioError(null);
            setIsLoadingAudio(false);
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
              setAudioCurrentTime(audioRef.current.currentTime);
            }
            if (
              lastSavedProgress[currentTrack.id] &&
              audioRef.current &&
              audioRef.current.currentTime === 0
            ) {
              audioRef.current.currentTime =
                lastSavedProgress[currentTrack.id].currentTime;
              setAudioCurrentTime(lastSavedProgress[currentTrack.id].currentTime);
            }
          }}
          onError={(e) => {
            const target = e.target as HTMLAudioElement;
            const err = target.error;
            let message = t('audio_load_fail');
            if (
              err?.code === 4 ||
              (currentTrack.url.includes('drive.google.com') && !isLoadingAudio)
            ) {
              message = t('audio_format_error');
            }
            setAudioError(message);
            setIsLoadingAudio(false);
          }}
        />
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
      />

      {/* PHASE 1: Pre-Session Setup */}
      {phase === 'idle' && (
        <div className="min-h-[72dvh] flex flex-col items-center justify-between py-6 px-2 text-center">
          <div className="space-y-2 pt-2">
            <h1 className="text-display text-ink">静坐</h1>
            <p className="text-caption">调息安住，随息观照</p>
          </div>

          {/* Center Preview Circle & Selected Duration */}
          <div className="my-8 flex flex-col items-center space-y-5 w-full">
            <div
              className="w-36 h-36 rounded-full opacity-85 transition-transform duration-700"
              style={{ background: 'var(--theme-gradient)' }}
            />
            <div className="text-counter !text-[40px] text-ink tabular-nums">
              {formatTime(selectedDuration * 60)}
            </div>

            {/* Duration Capsules (5/10/15/20/30 + Custom) */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-2">
              {DURATION_PRESETS.map((mins) => {
                const isSelected = !showCustomDuration && selectedDuration === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationSelect(mins)}
                    className={cn(
                      'px-4 h-9 rounded-full text-sm transition-colors border',
                      isSelected
                        ? 'bg-accent-mist text-accent border-transparent font-medium'
                        : 'border-line text-ink-2 hover:text-ink hover:border-line-strong'
                    )}
                  >
                    {mins} 分钟
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCustomMinutesInput(String(selectedDuration));
                  setShowCustomDuration((v) => !v);
                }}
                className={cn(
                  'px-4 h-9 rounded-full text-sm transition-colors border',
                  showCustomDuration || !DURATION_PRESETS.includes(selectedDuration)
                    ? 'bg-accent-mist text-accent border-transparent font-medium'
                    : 'border-line text-ink-2 hover:text-ink hover:border-line-strong'
                )}
              >
                {!DURATION_PRESETS.includes(selectedDuration) && !showCustomDuration
                  ? `${selectedDuration} 分钟`
                  : '自定义'}
              </button>
            </div>

            {/* Inline Custom Duration Input */}
            <AnimatePresence>
              {showCustomDuration && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyCustomDuration();
                    }}
                    className="w-20 h-9 text-center rounded-full bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                  />
                  <span className="text-caption">分钟</span>
                  <button
                    type="button"
                    onClick={handleApplyCustomDuration}
                    className="px-4 h-9 rounded-full bg-accent text-on-accent text-xs font-medium"
                  >
                    确定
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Primary CTA (「入座」) + Sound Bottom Sheet Trigger */}
          <div className="w-full max-w-sm space-y-4">
            <div className="relative flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.04, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-accent-soft pointer-events-none"
              />
              <button
                type="button"
                onClick={handleStartSitting}
                className="relative z-10 w-full h-14 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-base font-medium shadow-float transition-colors"
              >
                入座
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSoundSheet(true)}
              className="mx-auto flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full text-caption text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <Volume2 size={15} strokeWidth={1.5} className="text-accent shrink-0" />
              <span className="truncate max-w-[260px]">
                声音：{activeSoundTitle} · {reminderSummary}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: Full-Screen Immersive Meditation */}
      <AnimatePresence>
        {phase === 'active' && (
          <motion.div
            key="meditation-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => revealControlsTemporarily()}
            className="fixed inset-0 z-40 h-[100dvh] w-full bg-paper flex flex-col items-center justify-center px-6 overflow-hidden select-none"
          >
            {/* Central 200px Breathing Circle */}
            <div className="flex flex-col items-center justify-center">
              <motion.div
                animate={
                  isPaused
                    ? { scale: 1 }
                    : { scale: [1, 1.15, 1] }
                }
                transition={
                  isPaused
                    ? { duration: 0.4 }
                    : {
                        duration: 8,
                        times: [0, 0.5, 1],
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                }
                className="w-[200px] h-[200px] rounded-full opacity-85"
                style={{ background: 'var(--theme-gradient)' }}
              />

              {/* Inhale / Exhale synchronized fade cue below circle */}
              <div className="h-8 mt-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isPaused ? 'paused' : breathPhase}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-caption tracking-[0.25em] pl-[0.25em]"
                  >
                    {isPaused ? '已暂停' : breathPhase}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Remaining Time (.text-counter 40px, tap to toggle visibility) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimer((v) => !v);
                  revealControlsTemporarily();
                }}
                className="mt-4 min-h-[52px] flex items-center justify-center cursor-pointer"
                title={showTimer ? '轻点隐藏时间' : '轻点显示时间'}
              >
                <AnimatePresence>
                  {showTimer && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-counter !text-[40px] text-ink tabular-nums"
                    >
                      {formatTime(timeLeft)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Audio Error Notice (if audio fails during session) */}
            {audioError && currentTrack && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-6 max-w-xs w-full p-4 rounded-2xl bg-surface border border-line text-center space-y-2 shadow-float"
              >
                <p className="text-xs text-ink">{audioError}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAudioError(null);
                      if (audioRef.current) {
                        audioRef.current.load();
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    重试音频
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioError(null);
                      selectTrack(null);
                    }}
                    className="text-xs text-ink-2 hover:text-ink"
                  >
                    转为静音
                  </button>
                </div>
              </div>
            )}

            {/* Tap-to-reveal Controls (hidden by default; auto-hide after 3s) */}
            <AnimatePresence>
              {controlsVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => {
                    e.stopPropagation();
                    revealControlsTemporarily();
                  }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 mb-[env(safe-area-inset-bottom)]"
                >
                  <div className="h-12 px-2 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-float flex items-center gap-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setIsPaused((p) => !p)}
                      className="h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
                    >
                      {isPaused ? (
                        <>
                          <Play size={14} strokeWidth={1.5} />
                          <span>继续</span>
                        </>
                      ) : (
                        <>
                          <Pause size={14} strokeWidth={1.5} />
                          <span>暂停</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTimer((v) => !v)}
                      className="h-9 px-3 rounded-full flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
                    >
                      {showTimer ? (
                        <>
                          <EyeOff size={14} strokeWidth={1.5} />
                          <span>隐藏时间</span>
                        </>
                      ) : (
                        <>
                          <Eye size={14} strokeWidth={1.5} />
                          <span>显示时间</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSoundSheet(true)}
                      className="h-9 px-3 rounded-full flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
                    >
                      <Volume2 size={14} strokeWidth={1.5} />
                      <span>声音</span>
                    </button>

                    <div className="w-px h-4 bg-line mx-0.5" />

                    <button
                      type="button"
                      onClick={handleManualEndSession}
                      className="h-9 px-4 rounded-full bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors"
                    >
                      结束
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 3: Post-Session「此刻的心」Five-Dot Mind Check */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            key="meditation-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 h-[100dvh] w-full bg-paper flex flex-col items-center justify-between px-6 py-12 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="text-caption pt-4">
              本次静坐 {sessionDuration} 分钟 · {activeSoundTitle}
            </div>

            <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
              <div className="space-y-2">
                <h2 className="text-title text-ink">此刻的心</h2>
                <p className="text-caption">轻轻觉察当下的心境，不必评判好坏</p>
              </div>

              {/* 5 Gradient Dots: 散乱 · 微乱 · 平常 · 安定 · 清明 */}
              <div className="w-full grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((opt) => {
                  const isSelected = selectedMood === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSelectedMood(opt.label)}
                      className="flex flex-col items-center gap-2.5 py-2 rounded-2xl focus:outline-none group"
                    >
                      <span
                        className={cn(
                          'w-8 h-8 rounded-full transition-all duration-200 block',
                          isSelected
                            ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-[var(--theme-bg)]'
                            : 'group-hover:scale-105'
                        )}
                        style={{ backgroundColor: opt.color }}
                      />
                      <span
                        className={cn(
                          'text-xs transition-colors',
                          isSelected ? 'text-ink font-medium' : 'text-ink-2'
                        )}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full max-w-sm space-y-3 text-center">
              <button
                type="button"
                onClick={handleSaveToVowBook}
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-on-accent font-medium shadow-float transition-colors"
              >
                记入愿簿
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStartRef.current = null;
                  endTimeRef.current = null;
                  lastMilestoneRef.current = 0;
                  setIsPaused(false);
                  setSelectedMood(undefined);
                  setPhase('idle');
                  setTimeLeft(selectedDuration * 60);
                }}
                className="text-caption text-ink-2 hover:text-ink py-1.5 px-4 transition-colors"
              >
                暂不记录，返回
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 「声音」Bottom Sheet (Audio Management: Firestore tracks, Local Uploads, URL Import, Volume, Loop, Seek) */}
      <AnimatePresence>
        {showSoundSheet && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSoundSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-surface border-t border-line shadow-float flex flex-col max-h-[82dvh] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2 shrink-0" />

              {/* Sheet Header */}
              <div className="px-6 py-3 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-title text-ink">声音与提醒</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((s) => (s === 'newest' ? 'name' : 'newest'))
                    }
                    className="h-9 px-3 rounded-full bg-surface-2 text-ink-2 hover:text-ink text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    title={sortOrder === 'newest' ? t('sort_by_time') : t('sort_by_name')}
                  >
                    {sortOrder === 'newest' ? (
                      <Clock size={14} strokeWidth={1.5} />
                    ) : (
                      <SortAsc size={14} strokeWidth={1.5} />
                    )}
                    <span>{sortOrder === 'newest' ? '最新' : '名称'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput((v) => !v)}
                    className="w-9 h-9 rounded-full bg-surface-2 text-ink-2 hover:text-ink flex items-center justify-center transition-colors shrink-0"
                    title="导入音频链接"
                  >
                    <LinkIcon size={15} strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-3 rounded-full bg-accent-mist text-accent text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Upload size={14} strokeWidth={1.5} />
                    <span>{t('upload_audio')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSoundSheet(false)}
                    aria-label="关闭"
                    className="w-9 h-9 rounded-full text-ink-2 hover:text-ink flex items-center justify-center shrink-0"
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Volume, Loop & Optional URL Import */}
              <div className="px-6 py-3.5 border-b border-line space-y-3 shrink-0">
                <div className="flex items-center gap-3">
                  <Volume2 size={16} strokeWidth={1.5} className="text-ink-2 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent"
                  />
                  <span className="text-xs text-ink-2 tabular-nums w-9 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                  {currentTrack && (
                    <button
                      type="button"
                      onClick={() => setIsLooping((l) => !l)}
                      className={cn(
                        'h-8 px-3 rounded-full text-xs flex items-center gap-1 transition-colors border whitespace-nowrap shrink-0',
                        isLooping
                          ? 'bg-accent-mist text-accent border-transparent font-medium'
                          : 'bg-surface-2 text-ink-2 border-line'
                      )}
                    >
                      <ArrowUpDown size={12} strokeWidth={1.5} />
                      <span>{isLooping ? t('loop_play') : t('single_play')}</span>
                    </button>
                  )}
                </div>

                {currentTrack && audioDuration > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-ink-2 tabular-nums">
                      <span>{formatTime(Math.floor(audioCurrentTime))}</span>
                      <span>{formatTime(Math.floor(audioDuration))}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={audioDuration}
                      step="0.1"
                      value={audioCurrentTime}
                      onChange={(e) => {
                        const pos = parseFloat(e.target.value);
                        if (audioRef.current) {
                          audioRef.current.currentTime = pos;
                          setAudioCurrentTime(pos);
                        }
                      }}
                      className="w-full h-1 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                )}

                <AnimatePresence>
                  {showUrlInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          placeholder={t('paste_audio_link')}
                          className="flex-1 h-10 bg-surface-2 border border-line rounded-xl px-3 text-xs text-ink focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={handleUrlImport}
                          className="h-10 px-4 rounded-xl bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors whitespace-nowrap shrink-0"
                        >
                          {t('import_btn')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scrollable Reminder Settings + Ambient & Track List */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* 1. Reminder Settings */}
                <section className="space-y-3.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Bell size={15} strokeWidth={1.5} className="text-accent" />
                      <h4 className="text-sm font-medium text-ink">静坐提醒</h4>
                    </div>
                    <span className="text-xs text-ink-2">点击音色可试听</span>
                  </div>

                  {/* Selectable Reminder Tone */}
                  <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-surface-2">
                    {REMINDER_TONE_OPTIONS.map((tone) => {
                      const active = reminderTone === tone.id;
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          onClick={() => {
                            setReminderTone(tone.id);
                            if (tone.id !== 'none') {
                              if (volume <= 0) {
                                toast('当前音量为 0%，可向右调整音量试听');
                              } else {
                                playMeditationCue(tone.id, Math.max(0.35, volume), false);
                              }
                            }
                          }}
                          className={cn(
                            'min-h-[40px] px-2 rounded-xl text-xs transition-colors whitespace-nowrap',
                            active
                              ? 'bg-surface text-ink font-medium shadow-sm'
                              : 'text-ink-2 hover:text-ink'
                          )}
                        >
                          {tone.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Interval Reminder Selector */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-ink-2 px-1">中途间隔提醒</p>
                    <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-surface-2">
                      {INTERVAL_REMINDER_OPTIONS.map((opt) => {
                        const active = intervalReminder === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setIntervalReminder(opt.id)}
                            className={cn(
                              'min-h-[40px] px-2 rounded-xl text-xs transition-colors whitespace-nowrap',
                              active
                                ? 'bg-surface text-ink font-medium shadow-sm'
                                : 'text-ink-2 hover:text-ink'
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reminder Toggles */}
                  <div className="divide-y divide-line border-t border-b border-line">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !startEndBell;
                        setStartEndBell(next);
                        if (next && reminderTone !== 'none' && volume > 0) {
                          playMeditationCue(reminderTone, Math.max(0.35, volume), false);
                        }
                      }}
                      className="w-full min-h-[52px] py-2.5 px-1 flex items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <p className="text-sm text-ink">入座与圆满提示音</p>
                        <p className="text-xs text-ink-2">开始入座与时间到时响起所选提醒音</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center',
                          startEndBell ? 'bg-accent justify-end' : 'bg-surface-2 justify-start'
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-surface shadow-sm block" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !breathCueEnabled;
                        setBreathCueEnabled(next);
                        if (next && volume > 0) {
                          playBreathChime(Math.max(0.15, volume * 0.35), 'inhale');
                        }
                      }}
                      className="w-full min-h-[52px] py-2.5 px-1 flex items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <p className="text-sm text-ink">呼吸换息微音</p>
                        <p className="text-xs text-ink-2">每 4 秒吸气/呼气转换时轻声引导，闭眼可用</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center',
                          breathCueEnabled ? 'bg-accent justify-end' : 'bg-surface-2 justify-start'
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-surface shadow-sm block" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVibrateOnComplete((v) => !v)}
                      className="w-full min-h-[52px] py-2.5 px-1 flex items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <p className="text-sm text-ink">圆满震动与系统提醒</p>
                        <p className="text-xs text-ink-2">静坐结束时温和震动及浏览器通知</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center',
                          vibrateOnComplete ? 'bg-accent justify-end' : 'bg-surface-2 justify-start'
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-surface shadow-sm block" />
                      </span>
                    </button>
                  </div>
                </section>

                {/* 2. Background / Ambient Sound Selection */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-medium text-ink">静坐伴音</h4>
                    <span className="text-xs text-ink-2">内置自然声离线可用</span>
                  </div>

                  <div className="divide-y divide-line">
                    {/* Silent Option */}
                    <button
                      type="button"
                      onClick={() => {
                        selectAmbient(null, false);
                        setShowSoundSheet(false);
                      }}
                      className="w-full min-h-[56px] py-3 px-2 flex items-center justify-between text-left rounded-xl hover:bg-surface-2 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">静音静坐</p>
                        <p className="text-caption">无背景音乐，仅按上方提醒设置响铃</p>
                      </div>
                      {!currentTrack && !selectedAmbientId && (
                        <Check size={17} className="text-accent shrink-0" />
                      )}
                    </button>

                    {/* Built-in Offline Ambient Soundscapes */}
                    {AMBIENT_SOUNDS.map((ambient) => {
                      const isSelected = !currentTrack && selectedAmbientId === ambient.id;
                      const isPreviewing = previewingAmbientId === ambient.id;
                      const AmbientIcon =
                        ambient.id === 'wind'
                          ? Wind
                          : ambient.id === 'rain'
                          ? CloudRain
                          : ambient.id === 'stream'
                          ? Droplets
                          : Waves;
                      return (
                        <div
                          key={ambient.id}
                          onClick={() => {
                            selectAmbient(ambient.id, phase === 'idle');
                            if (phase === 'active') {
                              setShowSoundSheet(false);
                            }
                          }}
                          className="min-h-[56px] py-3 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-xl hover:bg-surface-2 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                                isSelected
                                  ? 'bg-accent-mist text-accent'
                                  : 'bg-surface-2 text-ink-2'
                              )}
                            >
                              <AmbientIcon size={16} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink truncate">
                                {ambient.title}
                              </p>
                              <p className="text-caption truncate">{ambient.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {phase === 'idle' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAmbientPreview(ambient.id);
                                }}
                                aria-label={isPreviewing ? '停止试听' : '试听'}
                                className={cn(
                                  'h-8 px-2.5 rounded-full text-xs flex items-center gap-1 transition-colors whitespace-nowrap',
                                  isPreviewing
                                    ? 'bg-accent text-on-accent'
                                    : 'bg-surface-2 text-ink-2 hover:text-ink'
                                )}
                              >
                                {isPreviewing ? (
                                  <>
                                    <Square size={10} fill="currentColor" />
                                    <span>停止</span>
                                  </>
                                ) : (
                                  <>
                                    <Play size={11} />
                                    <span>试听</span>
                                  </>
                                )}
                              </button>
                            )}
                            {isSelected && <Check size={17} className="text-accent ml-1" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 3. Cloud & Local Custom Tracks */}
                <section className="space-y-2">
                  <div className="px-1">
                    <h4 className="text-sm font-medium text-ink">我的与云端音频</h4>
                  </div>

                  {allTracks.length === 0 ? (
                    <div className="py-6 text-center">
                      <Music className="w-7 h-7 text-ink-3 mx-auto mb-1.5" strokeWidth={1.5} />
                      <p className="text-caption">{t('no_track')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {allTracks.map((track) => {
                        const isSelected = currentTrack?.id === track.id;
                        return (
                          <div
                            key={track.id}
                            onClick={() => {
                              selectTrack(track);
                              setShowSoundSheet(false);
                            }}
                            className="min-h-[56px] py-3 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-xl hover:bg-surface-2 transition-colors"
                          >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                              isSelected
                                ? 'bg-accent-mist text-accent'
                                : 'bg-surface-2 text-ink-2'
                            )}
                          >
                            {track.isUrl ? (
                              <LinkIcon size={16} strokeWidth={1.5} />
                            ) : track.isLocal ? (
                              <FileAudio size={16} strokeWidth={1.5} />
                            ) : (
                              <Music size={16} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {renamingId === track.id ? (
                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  autoFocus
                                  type="text"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') renameTrack(track.id, newTitle);
                                    if (e.key === 'Escape') setRenamingId(null);
                                  }}
                                  className="bg-surface border border-line-strong rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent w-36"
                                />
                                <button
                                  type="button"
                                  onClick={() => renameTrack(track.id, newTitle)}
                                  className="p-1 text-accent"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingId(null)}
                                  className="p-1 text-ink-2"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-ink truncate">
                                {track.title}
                              </p>
                            )}
                            <p className="text-caption truncate">
                              {[track.duration, track.description].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {track.isLocal && renamingId !== track.id && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingId(track.id);
                                  setNewTitle(track.title);
                                }}
                                aria-label="重命名"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface"
                              >
                                <Edit2 size={14} strokeWidth={1.5} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTrack(track.id);
                                }}
                                aria-label="删除"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface"
                              >
                                <Trash2 size={14} strokeWidth={1.5} />
                              </button>
                            </>
                          )}
                            {isSelected && <Check size={17} className="text-accent ml-1" />}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};