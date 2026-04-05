export const identityService = {
  getUserId(): string {
    let uid = localStorage.getItem('zen_user_id');
    if (!uid || (!uid.startsWith('guest_') && !uid.startsWith('email_') && !uid.startsWith('google_'))) {
      const randomStr = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      uid = 'guest_' + randomStr;
      localStorage.setItem('zen_user_id', uid);
    }
    return uid;
  },
  
  setUserId(id: string) {
    localStorage.setItem('zen_user_id', id);
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
    return this.getUserId().startsWith('guest_');
  },

  isEmailUser(): boolean {
    return this.getUserId().startsWith('email_');
  } 
};
