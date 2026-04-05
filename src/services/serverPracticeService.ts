import { DailyPractice, PracticeActivityType, PracticeSettings } from '../types/practice';

export const serverPracticeService = {
  getSettings: async (userEmail: string): Promise<PracticeSettings> => {
    const response = await fetch(`/api/settings/${userEmail}`);
    return response.json();
  },

  saveSettings: async (userEmail: string, settings: PracticeSettings) => {
    await fetch(`/api/settings/${userEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  getDailyPractice: async (userEmail: string): Promise<DailyPractice> => {
    const response = await fetch(`/api/practice/${userEmail}`);
    return response.json();
  },

  saveDailyPractice: async (userEmail: string, practice: DailyPractice) => {
    await fetch(`/api/practice/${userEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(practice),
    });
  },

  getTotalPoints: async (userEmail: string): Promise<number> => {
    const response = await fetch(`/api/merit/${userEmail}`);
    const data = await response.json();
    return data.points;
  },

  addPoints: async (userEmail: string, points: number) => {
    await fetch(`/api/merit/${userEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });
  },

  // ... other methods ...
}; 
