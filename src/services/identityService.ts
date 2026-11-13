import { safeStorage } from '../utils/safeStorage';
import { auth } from '../firebase';

export const identityService = {
  getUserId(): string {
    let uid = safeStorage.getItem('zen_user_id');
    if (!uid || !uid.trim()) {
      const randomStr = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      uid = 'guest_' + randomStr;
      safeStorage.setItem('zen_user_id', uid);
    }
    return uid;
  },
  
  setUserId(id: string) {
    safeStorage.setItem('zen_user_id', id);
  },

  onFirebaseLogin(uid: string): string {
    if (!uid) return this.getUserId();
    const prevUid = safeStorage.getItem('zen_user_id');
    if (prevUid !== uid) {
      safeStorage.setItem('zen_user_id', uid);
      window.dispatchEvent(new CustomEvent('auth_state_changed'));
    }
    return uid;
  },

  logout() {
    const preserveKeys = [
      'zen_theme',
      'app_language',
      'zen_font_size',
      'zen_onboarding_seen',
      'zen_volume',
      'zen_sound_type',
      'zen_fish_appearance',
      'zen_meditation_fish_appearance',
      'zen_agreed_to_terms'
    ];

    const prefixesToRemove = [
      'zen_',
      'good_deed_',
      'eightfold_',
      'personal_vow',
      'universal_vow',
      'vow_date',
      'meditation_progress'
    ];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !preserveKeys.includes(key)) {
        if (prefixesToRemove.some(prefix => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    this.getUserId(); // Generate new guest ID
  },

  isGuest(): boolean {
    if (auth.currentUser) return false;
    return this.getUserId().startsWith('guest_');
  },

  isEmailUser(): boolean {
    return Boolean(
      auth.currentUser?.providerData?.some((p) => p.providerId === 'password')
    );
  }
};
