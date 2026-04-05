export interface PracticeRecord {
  id: string;
  timestamp: number;
  action_summary: string;
  eightfold_path: {
    primary: string;
    mind_shift: string;
  };
  merit_system: {
    base_points: number;
    mind_power_bonus: number;
    current_attribute: string;
  };
  ceo_strategy_insight: string;
  habit_nudge: string;
  merit_dedication: string;
  status_update: string;
} 
