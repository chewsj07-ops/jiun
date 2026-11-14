export type PracticeActivityType = 
  | 'chanting' 
  | 'meditation' 
  | 'observing_thoughts' 
  | 'rejoicing' 
  | 'good_deeds' 
  | 'dedication' 
  | 'full_dedication'
  | 'evening_class';

export const MEDITATION_PRACTICE_ID = '__meditation__';

export interface DailyPracticeItem {
  scriptureId: string;
  target: number;
  unit?: '遍' | '声';
  order: number;
  enabled: boolean;
  kind?: 'chant' | 'meditation';
  minutes?: number;
}

export interface DailyPractice {
  date: string; // YYYY-MM-DD
  chanting: number; // Count
  scriptureCounts: Record<string, number>; // Count per scripture
  celebratedScriptures?: string[]; // Scripture IDs whose completion celebration already fired today
  ritual_done?: 'full' | 'brief' | 'skip'; // W1/W2 morning ritual completion mode
  todayIntention?: string; // W2 today's single mindful intention
  meditation: number; // Minutes
  observing_thoughts: number; // Count
  rejoicing: number; // Count
  good_deeds: number; // Count
  dedication: boolean; // Completed
  full_dedication: boolean; // Completed
  evening_class: boolean; // Completed
}

export interface PracticeSettings {
  scriptureGoals: Record<string, number>;
  scriptureGoalTypes?: Record<string, 'count' | 'time'>;
  dailyPractice?: DailyPracticeItem[];
  dailyPracticeUpdatedAt?: number;
  aiEnabled?: boolean;
  aiApiKey?: string;
  middayReminderEnabled?: boolean;
}

export interface PracticeLevelInfo {
  level: number;
  nameKey: string;
  minPoints: number;
}

export const PRACTICE_WEIGHTS: Record<PracticeActivityType, number> = {
  chanting: 20,
  meditation: 20,
  observing_thoughts: 15,
  rejoicing: 10,
  good_deeds: 15,
  dedication: 10,
  full_dedication: 10,
  evening_class: 15
};

export const MERIT_ENERGY_POINTS: Record<PracticeActivityType, number> = {
  chanting: 5,
  meditation: 10,
  observing_thoughts: 5,
  rejoicing: 3,
  good_deeds: 8,
  dedication: 3,
  full_dedication: 3,
  evening_class: 5
};

export const PRACTICE_LEVELS: PracticeLevelInfo[] = [
  { level: 1, nameKey: 'level_1_name', minPoints: 0 },
  { level: 2, nameKey: 'level_2_name', minPoints: 500 }, // Approx 5-7 days of full practice
  { level: 3, nameKey: 'level_3_name', minPoints: 2000 }, // ~1 month
  { level: 4, nameKey: 'level_4_name', minPoints: 10000 }, // ~4-5 months
  { level: 5, nameKey: 'level_5_name', minPoints: 50000 } // ~2 years
];