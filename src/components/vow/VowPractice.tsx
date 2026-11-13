import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Calendar, Heart, Sparkles, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { DailyGoodDeed } from './DailyGoodDeed';
import { ZenAssistant } from '../ZenAssistant';

export const VowPractice = ({ 
  initialSection = 'menu', 
  user, 
  onLevelUp 
}: { 
  initialSection?: 'menu' | 'coach' | 'wisdom' | 'zen' | 'setup_vow'; 
  user: any; 
  onLevelUp: (msg: string) => void;
}) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<'menu' | 'coach' | 'wisdom' | 'zen' | 'setup_vow'>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [personalVow, setPersonalVow] = useState<string>(() => {
    return localStorage.getItem('personal_vow') || "";
  });
  const [universalVow, setUniversalVow] = useState<string>(() => {
    return localStorage.getItem('universal_vow') || "";
  });
  const [vowDate, setVowDate] = useState<string>(() => {
    return localStorage.getItem('vow_date') || "";
  });

  const handleSaveVows = () => {
    const today = new Date().toLocaleDateString();
    localStorage.setItem('personal_vow', personalVow);
    localStorage.setItem('universal_vow', universalVow);
    localStorage.setItem('vow_date', today);
    setVowDate(today);
    window.dispatchEvent(new Event('vow_updated'));
    setActiveSection('menu');
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-8 w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {activeSection === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full space-y-4"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-ink mb-2">{t('vow_practice_title')}</h2>
              <p className="text-ink-2 text-sm">{t('vow_practice_subtitle')}</p>
            </div>

            <button
              onClick={() => setActiveSection('wisdom')}
              className="w-full bg-surface p-6 rounded-2xl border border-line hover:border-line-strong transition-all group text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent-mist text-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-ink group-hover:text-accent transition-colors">{t('zen_wisdom_card_title')}</h3>
                <p className="text-xs text-ink-2 mt-1">{t('zen_wisdom_card_desc')}</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('zen')}
              className="w-full bg-surface p-6 rounded-2xl border border-line hover:border-line-strong transition-all group text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent-mist text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-ink group-hover:text-accent transition-colors">AI 禅师指引</h3>
                <p className="text-xs text-ink-2 mt-1">与 AI 禅师对话，获得智慧指引。</p>
              </div>
            </button>

            <div className="bg-surface-2 p-6 rounded-2xl border border-line mt-8 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-ink">{t('my_vows_title')}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {vowDate && (
                    <span className="text-[10px] text-ink-3 font-medium">
                      {vowDate}
                    </span>
                  )}
                  <button 
                    onClick={() => setActiveSection('setup_vow')}
                    className="text-xs bg-accent-mist text-accent px-3 py-1.5 rounded-full font-bold hover:bg-accent hover:text-on-accent transition-colors"
                  >
                    设定愿力
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-accent font-bold mb-1">个人愿力</p>
                  <p className="text-sm text-ink-2 italic">
                    "{personalVow || t('default_vow_text')}"
                  </p>
                </div>
                <div>
                  <p className="text-xs text-accent font-bold mb-1">众生愿力</p>
                  <p className="text-sm text-ink-2 italic">
                    "{universalVow || t('default_universal_vow')}"
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'setup_vow' && (
          <motion.div
            key="setup_vow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-6"
          >
            <button 
              onClick={() => setActiveSection('menu')}
              className="flex items-center gap-2 text-ink-2 hover:text-accent mb-2 text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
            
            <div className="bg-surface p-6 rounded-2xl border border-line space-y-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-accent-mist rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-bold font-serif text-xl text-ink">设定我的愿力</h3>
                <p className="text-xs text-ink-2 mt-2">愿力是修行的方向，也是前行的动力。</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-2">个人愿力</label>
                  <textarea
                    value={personalVow}
                    onChange={(e) => setPersonalVow(e.target.value)}
                    placeholder="例如：愿我今日觉察情绪，不轻易发怒..."
                    className="w-full p-4 rounded-2xl bg-surface-2 border border-line text-sm text-ink placeholder:text-ink-3 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none min-h-[100px] resize-none"
                  />
                  <p className="text-[10px] text-ink-3 mt-1">将显示在每页顶部，时刻提醒自己。</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-ink mb-2">众生愿力</label>
                  <textarea
                    value={universalVow}
                    onChange={(e) => setUniversalVow(e.target.value)}
                    placeholder="例如：愿一切众生离苦得乐..."
                    className="w-full p-4 rounded-2xl bg-surface-2 border border-line text-sm text-ink placeholder:text-ink-3 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none min-h-[100px] resize-none"
                  />
                  <p className="text-[10px] text-ink-3 mt-1">将显示在功德能量地图中，与世界共振。</p>
                </div>
              </div>

              <button
                onClick={handleSaveVows}
                className="w-full bg-accent text-on-accent hover:bg-accent-hover py-4 rounded-2xl font-bold transition-colors"
              >
                保存愿力
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'wisdom' && (
          <motion.div
            key="wisdom"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <button 
              onClick={() => setActiveSection('menu')}
              className="flex items-center gap-2 text-ink-2 hover:text-accent mb-6 text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
            <DailyGoodDeed user={user} onLevelUp={onLevelUp} />
          </motion.div>
        )}

        {activeSection === 'zen' && (
          <motion.div
            key="zen"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <button 
              onClick={() => setActiveSection('menu')}
              className="flex items-center gap-2 text-ink-2 hover:text-accent mb-6 text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
            <ZenAssistant user={user} onLevelUp={onLevelUp} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};