import { DailyPractice, DailyPracticeItem, PRACTICE_LEVELS, PRACTICE_WEIGHTS, PracticeActivityType, MERIT_ENERGY_POINTS, PracticeSettings } from '../types/practice';
import { io, Socket } from 'socket.io-client';
import { safeStorage } from '../utils/safeStorage';

const STORAGE_KEY_PRACTICE = 'zen_daily_practice';
const STORAGE_KEY_TOTAL_POINTS = 'zen_total_practice_points';
const STORAGE_KEY_MERIT_HISTORY = 'zen_merit_history';
const STORAGE_KEY_REJOICE_HISTORY = 'zen_rejoice_history';
const STORAGE_KEY_SETTINGS = 'zen_practice_settings';
const STORAGE_KEY_RECENT_SCRIPTURES = 'zen_recent_scriptures';

let socket: Socket | null = null;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldStayConnected = false;
let realtimeOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
const realtimeListeners = new Set<(offline: boolean) => void>();
let globalMeritStats = { today: 0, week: 0, total: 0 };

function setRealtimeOffline(offline: boolean) {
  if (realtimeOffline !== offline) {
    realtimeOffline = offline;
    realtimeListeners.forEach((listener) => {
      try {
        listener(offline);
      } catch {
        // ignore listener error
      }
    });
  }
}

function clearDisconnectTimer() {
  if (disconnectTimer !== null) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
}

function scheduleIdleDisconnect(delayMs = 30000) {
  clearDisconnectTimer();
  disconnectTimer = setTimeout(() => {
    disconnectTimer = null;
    if (!shouldStayConnected && socket) {
      socket.disconnect();
    }
  }, delayMs);
}

function attachSocketListeners(s: Socket) {
  s.on('connect', () => {
    setRealtimeOffline(false);
  });
  s.on('merit:update', (data) => {
    globalMeritStats = data;
  });
  s.on('connect_error', () => {
    setRealtimeOffline(true);
  });
  s.io.on('reconnect_failed', () => {
    setRealtimeOffline(true);
  });
  s.on('disconnect', () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setRealtimeOffline(true);
    }
  });
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setRealtimeOffline(true);
    return null;
  }

  if (!socket) {
    socket = io(window.location.origin, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 16000,
      timeout: 8000,
      autoConnect: true,
    });
    attachSocketListeners(socket);
  } else if (!socket.connected) {
    socket.connect();
  }

  if (!shouldStayConnected) {
    scheduleIdleDisconnect(30000);
  }

  return socket;
}

export function connectRealtime(): Socket | null {
  shouldStayConnected = true;
  clearDisconnectTimer();
  return getSocket();
}

export function disconnectRealtime(delayMs = 30000): void {
  shouldStayConnected = false;
  if (!socket) {
    clearDisconnectTimer();
    return;
  }
  if (delayMs <= 0) {
    clearDisconnectTimer();
    socket.disconnect();
    return;
  }
  scheduleIdleDisconnect(delayMs);
}

export function isRealtimeOffline(): boolean {
  return realtimeOffline;
}

export function subscribeRealtimeStatus(listener: (offline: boolean) => void): () => void {
  realtimeListeners.add(listener);
  listener(realtimeOffline);
  return () => {
    realtimeListeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setRealtimeOffline(false);
    if (shouldStayConnected) {
      connectRealtime();
    }
  });
  window.addEventListener('offline', () => {
    setRealtimeOffline(true);
  });
}

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultUnitForCategory = (category?: string): '遍' | '声' => {
  return category === 'sutra' ? '遍' : '声';
};

export const getDefaultTargetForCategory = (category?: string): number => {
  return category === 'sutra' ? 3 : 108;
};

const defaultDailyPractice: DailyPractice = {
  date: getTodayDate(),
  chanting: 0,
  scriptureCounts: {},
  celebratedScriptures: [],
  meditation: 0,
  observing_thoughts: 0,
  rejoicing: 0,
  good_deeds: 0,
  dedication: false,
  full_dedication: false,
  evening_class: false
};

const defaultSettings: PracticeSettings = {
  scriptureGoals: {},
  scriptureGoalTypes: {},
  aiEnabled: true,
};

export const practiceService = {
  getSettings: (): PracticeSettings => {
    return safeStorage.getJSON<PracticeSettings>(STORAGE_KEY_SETTINGS, defaultSettings);
  },

  saveSettings: (settings: Partial<PracticeSettings>) => {
    const current = practiceService.getSettings();
    const merged: PracticeSettings = {
      ...current,
      ...settings,
    };
    safeStorage.setJSON(STORAGE_KEY_SETTINGS, merged);
    window.dispatchEvent(new CustomEvent('zen_practice_settings_updated'));
  },

  getDailyPracticeList: (
    scriptures: Array<{ id: string; category?: string }> = []
  ): DailyPracticeItem[] => {
    const settings = practiceService.getSettings();
    if (Array.isArray(settings.dailyPractice)) {
      return [...settings.dailyPractice].sort((a, b) => a.order - b.order);
    }

    // Migrate existing legacy scriptureGoals into ordered dailyPractice entries without losing old values
    const legacyGoals = settings.scriptureGoals || {};
    const migrated: DailyPracticeItem[] = Object.entries(legacyGoals)
      .filter(([, val]) => typeof val === 'number' && val > 0)
      .map(([scriptureId, target], idx) => {
        const matched = scriptures.find((s) => s.id === scriptureId);
        return {
          scriptureId,
          target,
          unit: getDefaultUnitForCategory(matched?.category),
          order: idx,
          enabled: true,
        };
      });

    if (migrated.length > 0) {
      practiceService.saveSettings({ dailyPractice: migrated });
    }
    return migrated;
  },

  saveDailyPracticeList: (items: DailyPracticeItem[], updatedAtOverride?: number) => {
    const normalized = items.map((item, idx) => ({
      ...item,
      target: Math.min(100000, Math.max(1, Math.round(item.target || 1))),
      unit: item.unit === '遍' ? ('遍' as const) : ('声' as const),
      order: idx,
    }));
    const current = practiceService.getSettings();
    const nextGoals = { ...(current.scriptureGoals || {}) };
    normalized.forEach((item) => {
      nextGoals[item.scriptureId] = item.target;
    });
    const nextUpdatedAt =
      typeof updatedAtOverride === 'number' ? updatedAtOverride : Date.now();
    practiceService.saveSettings({
      dailyPractice: normalized,
      dailyPracticeUpdatedAt: nextUpdatedAt,
      scriptureGoals: nextGoals,
    });
    return normalized;
  },

  getRecentScriptureIds: (): string[] => {
    const saved = safeStorage.getJSON<string[]>(STORAGE_KEY_RECENT_SCRIPTURES, []);
    return Array.isArray(saved) ? saved.slice(0, 5) : [];
  },

  recordRecentScriptureId: (scriptureId: string): string[] => {
    if (!scriptureId) return practiceService.getRecentScriptureIds();
    const current = practiceService.getRecentScriptureIds();
    const next = [scriptureId, ...current.filter((id) => id !== scriptureId)].slice(0, 5);
    safeStorage.setJSON(STORAGE_KEY_RECENT_SCRIPTURES, next);
    return next;
  },

  getDailyPractice: (): DailyPractice => {
    const today = getTodayDate();
    const parsed = safeStorage.getJSON<DailyPractice | null>(STORAGE_KEY_PRACTICE, null);
    if (parsed) {
      if (parsed.date === today) {
        if (!parsed.scriptureCounts) parsed.scriptureCounts = {};
        if (!Array.isArray(parsed.celebratedScriptures)) parsed.celebratedScriptures = [];
        return parsed;
      }
    }
    return { ...defaultDailyPractice, date: today, celebratedScriptures: [] };
  },

  markScriptureCelebrated: (scriptureId: string): DailyPractice => {
    const practice = practiceService.getDailyPractice();
    const list = practice.celebratedScriptures || [];
    if (!list.includes(scriptureId)) {
      practice.celebratedScriptures = [...list, scriptureId];
      practiceService.saveDailyPractice(practice);
    }
    return practice;
  },

  saveDailyPractice: (practice: DailyPractice) => {
    safeStorage.setJSON(STORAGE_KEY_PRACTICE, practice);
  },

  getTotalPoints: (): number => {
    const saved = safeStorage.getItem(STORAGE_KEY_TOTAL_POINTS);
    return saved ? parseInt(saved, 10) : 0;
  },

  addPoints: (points: number) => {
    const current = practiceService.getTotalPoints();
    safeStorage.setItem(STORAGE_KEY_TOTAL_POINTS, (current + points).toString());
    getSocket()?.emit('merit:add', points);
  },

  // Merit Energy System
  getMeritHistory: (): Record<string, number> => {
    return safeStorage.getJSON<Record<string, number>>(STORAGE_KEY_MERIT_HISTORY, {});
  },

  saveMeritHistory: (history: Record<string, number>) => {
    safeStorage.setJSON(STORAGE_KEY_MERIT_HISTORY, history);
  },

  logMerit: (type: PracticeActivityType) => {
    const points = MERIT_ENERGY_POINTS[type];
    const history = practiceService.getMeritHistory();
    const today = getTodayDate();
    
    if (!history[today]) {
      history[today] = 0;
    }
    
    history[today] += points;
    practiceService.saveMeritHistory(history);
    getSocket()?.emit('merit:add', points);
    return points;
  },

  // Global Merit Simulation (Deterministic "Real" Data)
  getGlobalMeritStats: () => {
    return globalMeritStats;
  },

  getMeritStats: () => {
    const history = practiceService.getMeritHistory();
    const today = getTodayDate();
    const todayMerit = history[today] || 0;
    
    // Calculate total
    const totalMerit = Object.values(history).reduce((sum, val) => sum + val, 0);
    
    // Calculate this week (last 7 days)
    let weekMerit = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekMerit += (history[dateStr] || 0);
    }

    return { today: todayMerit, week: weekMerit, total: totalMerit };
  },

  getRejoiceHistory: (): Record<string, number> => {
    return safeStorage.getJSON<Record<string, number>>(STORAGE_KEY_REJOICE_HISTORY, {});
  },

  saveRejoiceHistory: (history: Record<string, number>) => {
    safeStorage.setJSON(STORAGE_KEY_REJOICE_HISTORY, history);
  },

  logRejoice: () => {
    const history = practiceService.getRejoiceHistory();
    const today = getTodayDate();
    
    if (!history[today]) {
      history[today] = 0;
    }
    
    history[today] += 1;
    practiceService.saveRejoiceHistory(history);
    getSocket()?.emit('merit:add', 1);
  },

  getRejoiceStats: () => {
    const history = practiceService.getRejoiceHistory();
    const today = getTodayDate();
    const todayCount = history[today] || 0;
    
    // Calculate total
    const totalCount = Object.values(history).reduce((sum, val) => sum + val, 0);
    
    // Calculate this week (last 7 days)
    let weekCount = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekCount += (history[dateStr] || 0);
    }

    return { today: todayCount, week: weekCount, total: totalCount };
  },

  calculateProgress: (practice: DailyPractice): number => {
    let progress = 0;

    // Chanting (Target: 108)
    if (practice.chanting >= 108) progress += PRACTICE_WEIGHTS.chanting;
    else progress += (practice.chanting / 108) * PRACTICE_WEIGHTS.chanting;

    // Meditation (Target: 15 mins)
    if (practice.meditation >= 15) progress += PRACTICE_WEIGHTS.meditation;
    else progress += (practice.meditation / 15) * PRACTICE_WEIGHTS.meditation;

    // Observing Thoughts (Target: 3 times)
    if (practice.observing_thoughts >= 3) progress += PRACTICE_WEIGHTS.observing_thoughts;
    else progress += (practice.observing_thoughts / 3) * PRACTICE_WEIGHTS.observing_thoughts;

    // Rejoicing (Target: 1 time)
    if (practice.rejoicing >= 1) progress += PRACTICE_WEIGHTS.rejoicing;

    // Good Deeds (Target: 1 time)
    if (practice.good_deeds >= 1) progress += PRACTICE_WEIGHTS.good_deeds;

    // Dedication
    if (practice.dedication) progress += PRACTICE_WEIGHTS.dedication;

    // Full Dedication
    if (practice.full_dedication) progress += PRACTICE_WEIGHTS.full_dedication;

    // Evening Class
    if (practice.evening_class) progress += PRACTICE_WEIGHTS.evening_class;

    return Math.min(100, Math.round(progress));
  },

  getLevel: () => {
    const points = practiceService.getTotalPoints();
    // Reverse to find the highest level met
    const level = [...PRACTICE_LEVELS].reverse().find(l => points >= l.minPoints);
    return level || PRACTICE_LEVELS[0];
  },

  updateActivity: (type: PracticeActivityType, value: number | boolean, scriptureId?: string) => {
    const practice = practiceService.getDailyPractice();
    const oldProgress = practiceService.calculateProgress(practice);

    switch (type) {
      case 'chanting':
        practice.chanting += (value as number);
        if (scriptureId) {
          if (!practice.scriptureCounts) practice.scriptureCounts = {};
          practice.scriptureCounts[scriptureId] = (practice.scriptureCounts[scriptureId] || 0) + (value as number);
        }
        break;
      case 'meditation':
        practice.meditation += (value as number);
        break;
      case 'observing_thoughts':
        practice.observing_thoughts += (value as number);
        break;
      case 'rejoicing':
        practice.rejoicing += (value as number);
        break;
      case 'good_deeds':
        practice.good_deeds += (value as number);
        break;
      case 'dedication':
        practice.dedication = (value as boolean);
        break;
      case 'full_dedication':
        practice.full_dedication = (value as boolean);
        break;
      case 'evening_class':
        practice.evening_class = (value as boolean);
        break;
    }

    practiceService.saveDailyPractice(practice);
    
    const newProgress = practiceService.calculateProgress(practice);
    const pointsDiff = newProgress - oldProgress;
    if (pointsDiff > 0) {
      practiceService.addPoints(pointsDiff);
    }
    
    return practice;
  },

  getSocket,
  connectRealtime,
  disconnectRealtime,
  isRealtimeOffline,
  subscribeRealtimeStatus,
};
