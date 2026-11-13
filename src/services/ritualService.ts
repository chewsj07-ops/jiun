import {
  DedicationTargetType,
  HomageStyle,
  PureMouthReps,
  RitualMode,
  RitualRunMode,
} from '../data/ritual';
import { cryptoService } from './cryptoService';
import { identityService } from './identityService';
import { safeStorage } from '../utils/safeStorage';

const STORAGE_KEY_RITUAL_SETTINGS = 'zen_ritual_settings';
const STORAGE_KEY_DAILY_RITUAL = 'zen_daily_ritual_state';

export interface RitualSettings {
  hasCompletedFirstRitual: boolean;
  mode: RitualMode;
  userChosenMode: boolean;
  homageStyle: HomageStyle;
  pureMouthReps: PureMouthReps;
  showWhy: boolean;
}

export interface DailyRitualState {
  date: string; // YYYY-MM-DD
  completedPreRitual: boolean;
  runMode: RitualRunMode | null;
  dedicationTargetType: DedicationTargetType | null;
  dedicationCustomName: string;
}

const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultRitualSettings: RitualSettings = {
  hasCompletedFirstRitual: false,
  mode: 'brief',
  userChosenMode: false,
  homageStyle: 'bow1',
  pureMouthReps: 3,
  showWhy: true,
};

export const ritualService = {
  getSettings(): RitualSettings {
    const saved = safeStorage.getJSON<Partial<RitualSettings>>(
      STORAGE_KEY_RITUAL_SETTINGS,
      {}
    );
    return {
      ...defaultRitualSettings,
      ...saved,
    };
  },

  saveSettings(partial: Partial<RitualSettings>): RitualSettings {
    const next: RitualSettings = {
      ...ritualService.getSettings(),
      ...partial,
    };
    safeStorage.setJSON(STORAGE_KEY_RITUAL_SETTINGS, next);
    window.dispatchEvent(new CustomEvent('zen_ritual_settings_updated'));
    return next;
  },

  getEffectiveMode(settings: RitualSettings = ritualService.getSettings()): RitualMode {
    if (!settings.hasCompletedFirstRitual) {
      return 'full';
    }
    return settings.mode;
  },

  markFirstRitualCompleted(): RitualSettings {
    const current = ritualService.getSettings();
    if (current.hasCompletedFirstRitual) return current;
    return ritualService.saveSettings({
      hasCompletedFirstRitual: true,
      mode: current.userChosenMode ? current.mode : 'brief',
    });
  },

  getDailyState(): DailyRitualState {
    const today = getTodayDateKey();
    const saved = safeStorage.getJSON<DailyRitualState | null>(
      STORAGE_KEY_DAILY_RITUAL,
      null
    );
    if (saved && saved.date === today) {
      return saved;
    }
    return {
      date: today,
      completedPreRitual: false,
      runMode: null,
      dedicationTargetType: null,
      dedicationCustomName: '',
    };
  },

  saveDailyState(partial: Partial<DailyRitualState>): DailyRitualState {
    const current = ritualService.getDailyState();
    const next: DailyRitualState = {
      ...current,
      ...partial,
      date: getTodayDateKey(),
    };
    safeStorage.setJSON(STORAGE_KEY_DAILY_RITUAL, next);
    window.dispatchEvent(new CustomEvent('zen_daily_ritual_updated'));
    return next;
  },

  resolveDedicationTargetLabel(
    targetType: DedicationTargetType | null,
    customName: string
  ): string {
    switch (targetType) {
      case 'self':
        return '自己';
      case 'family':
        return '家人';
      case 'all':
        return '一切众生';
      case 'person':
        return customName.trim();
      default:
        return '';
    }
  },

  formatRunModeLabel(mode?: RitualRunMode | null): string {
    if (mode === 'full') return '完整仪轨';
    if (mode === 'brief') return '简要仪轨';
    if (mode === 'direct') return '直接开始';
    return '';
  },

  async saveConfessionToThoughts(confessionText: string): Promise<boolean> {
    const trimmed = confessionText.trim();
    if (!trimmed) return false;

    const payload = {
      event: `【诵经前忏悔】${trimmed}`,
      action: '于佛前至诚忏悔，看见并放下。',
      result: '身心渐轻安。',
      learning: '忏悔不是自责，而是看见、承认、愿意改过。',
      vow: '愿我正念分明，少造身语意过失。',
    };

    const { ciphertext, iv } = await cryptoService.encrypt(JSON.stringify(payload));
    const entry = {
      id: Date.now(),
      uid: identityService.getUserId(),
      type: 'thought_observation',
      record_version: 1,
      emotions: ['ashamed'],
      timestamp: new Date().toISOString(),
      isEncrypted: true,
      content_encrypted: ciphertext,
      iv,
      isLocalOnly: true,
    };

    const existing = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const nextList = [entry, ...(Array.isArray(existing) ? existing : [])];
    safeStorage.setJSON('zen_thoughts', nextList);
    window.dispatchEvent(new CustomEvent('zen_data_updated'));
    window.dispatchEvent(new CustomEvent('zen_thoughts_updated'));
    return true;
  },
};
