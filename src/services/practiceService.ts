import { DailyPractice, PRACTICE_LEVELS, PRACTICE_WEIGHTS, PracticeActivityType, MERIT_ENERGY_POINTS, PracticeSettings } from '../types/practice';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY_PRACTICE = 'zen_daily_practice';
const STORAGE_KEY_TOTAL_POINTS = 'zen_total_practice_points';
const STORAGE_KEY_MERIT_HISTORY = 'zen_merit_history';
const STORAGE_KEY_REJOICE_HISTORY = 'zen_rejoice_history';
const STORAGE_KEY_SETTINGS = 'zen_practice_settings';

const socket: Socket = io(window.location.origin);
let globalMeritStats = { today: 0, week: 0, total: 0 };

socket.on('merit:update', (data) => {
  console.log('Received merit:update:', data);
  globalMeritStats = data;
});

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultDailyPractice: DailyPractice = {
  date: getTodayDate(),
  chanting: 0,
  scriptureCounts: {},
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
  aiEnabled: false,
  aiApiKey: ''
};

export const practiceService = {
  getSettings: (): PracticeSettings => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : defaultSettings;
  },

  saveSettings: (settings: PracticeSettings) => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  },

  getDailyPractice: (): DailyPractice => {
    const today = getTodayDate();
    const saved = localStorage.getItem(STORAGE_KEY_PRACTICE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) {
        if (!parsed.scriptureCounts) parsed.scriptureCounts = {};
        return parsed;
      }
    }
    return { ...defaultDailyPractice, date: today };
  },

  saveDailyPractice: (practice: DailyPractice) => {
    localStorage.setItem(STORAGE_KEY_PRACTICE, JSON.stringify(practice));
  },

  getTotalPoints: (): number => {
    const saved = localStorage.getItem(STORAGE_KEY_TOTAL_POINTS);
    return saved ? parseInt(saved, 10) : 0;
  },

  addPoints: (points: number) => {
    const current = practiceService.getTotalPoints();
    localStorage.setItem(STORAGE_KEY_TOTAL_POINTS, (current + points).toString());
    socket.emit('merit:add', points);
  },

  // Merit Energy System
  getMeritHistory: (): Record<string, number> => {
    const saved = localStorage.getItem(STORAGE_KEY_MERIT_HISTORY);
    return saved ? JSON.parse(saved) : {};
  },

  saveMeritHistory: (history: Record<string, number>) => {
    localStorage.setItem(STORAGE_KEY_MERIT_HISTORY, JSON.stringify(history));
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
    console.log('Emitting merit:add:', points);
    socket.emit('merit:add', points);
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
    const saved = localStorage.getItem(STORAGE_KEY_REJOICE_HISTORY);
    return saved ? JSON.parse(saved) : {};
  },

  saveRejoiceHistory: (history: Record<string, number>) => {
    localStorage.setItem(STORAGE_KEY_REJOICE_HISTORY, JSON.stringify(history));
  },

  logRejoice: () => {
    const history = practiceService.getRejoiceHistory();
    const today = getTodayDate();
    
    if (!history[today]) {
      history[today] = 0;
    }
    
    history[today] += 1;
    practiceService.saveRejoiceHistory(history);
    socket.emit('merit:add', 1);
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
  }
};
