import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Compass, Brain, Calendar, ArrowLeft, ScrollText } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { safeStorage } from '../utils/safeStorage';
import { DailyGoodDeed } from './vow/DailyGoodDeed';
import { EightfoldPractice } from './vow/EightfoldPractice';
import { ZenWisdom } from './vow/ZenWisdom';
import { ZenAssistant } from './ZenAssistant';
import { ThoughtCollector } from './ThoughtCollector';
import { ThoughtCoach } from './vow/ThoughtCoach';

export type VowBookSegment = 'vow' | 'mind' | 'merit';
export type VowFeatureSection = 'overview' | 'setup_vow' | 'good_deed' | 'eightfold' | 'wisdom';

interface VowBookViewProps {
  activeSegment: VowBookSegment;
  onSegmentChange: (segment: VowBookSegment) => void;
  vowSubSection?: VowFeatureSection;
  onVowSubSectionChange?: (section: VowFeatureSection) => void;
  user: any;
  onLevelUp: (msg: string) => void;
  historyContent: React.ReactNode;
}

export const VowBookView: React.FC<VowBookViewProps> = ({
  activeSegment,
  onSegmentChange,
  vowSubSection = 'overview',
  onVowSubSectionChange,
  user,
  onLevelUp,
  historyContent,
}) => {
  const { t } = useTranslation();
  const [innerSection, setInnerSection] = useState<VowFeatureSection>(vowSubSection);

  useEffect(() => {
    setInnerSection(vowSubSection);
  }, [vowSubSection]);

  const setSection = (sec: VowFeatureSection) => {
    setInnerSection(sec);
    onVowSubSectionChange?.(sec);
  };

  const [personalVow, setPersonalVow] = useState<string>(() => safeStorage.getItem('personal_vow') || '');
  const [universalVow, setUniversalVow] = useState<string>(() => safeStorage.getItem('universal_vow') || '');
  const [vowDate, setVowDate] = useState<string>(() => safeStorage.getItem('vow_date') || '');

  useEffect(() => {
    const syncVows = () => {
      setPersonalVow(safeStorage.getItem('personal_vow') || '');
      setUniversalVow(safeStorage.getItem('universal_vow') || '');
      setVowDate(safeStorage.getItem('vow_date') || '');
    };
    window.addEventListener('vow_updated', syncVows);
    return () => window.removeEventListener('vow_updated', syncVows);
  }, []);

  const handleSaveVows = () => {
    const today = new Date().toLocaleDateString();
    safeStorage.setItem('personal_vow', personalVow);
    safeStorage.setItem('universal_vow', universalVow);
    safeStorage.setItem('vow_date', today);
    setVowDate(today);
    window.dispatchEvent(new Event('vow_updated'));
    setSection('overview');
  };

  const segments: { id: VowBookSegment; label: string }[] = [
    { id: 'vow', label: '愿' },
    { id: 'mind', label: '观心' },
    { id: 'merit', label: '功德' },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      {/* Top Segmented Switcher: 愿 | 观心 | 功德 */}
      <div className="bg-surface-2 p-1.5 rounded-2xl border border-line grid grid-cols-3 gap-1">
        {segments.map((seg) => {
          const isActive = activeSegment === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSegmentChange(seg.id)}
              className={cn(
                'relative py-2.5 px-3 rounded-xl text-sm font-serif transition-colors min-h-[44px] flex items-center justify-center',
                isActive ? 'text-accent font-semibold' : 'text-ink-2 hover:text-ink'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="vowbook-segment-pill"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 bg-surface rounded-xl border border-line"
                />
              )}
              <span className="relative z-10">{seg.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeSegment === 'vow' && (
          <motion.div
            key="segment-vow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {innerSection === 'overview' && (
              <div className="space-y-4">
                {/* 个人愿力 & 众生愿力 */}
                <div className="bg-surface p-6 rounded-2xl border border-line">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-accent" />
                      <h2 className="text-lg font-serif font-bold text-ink">{t('my_vows_title')}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {vowDate && (
                        <span className="text-[11px] text-ink-3 font-medium">{vowDate}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSection('setup_vow')}
                        className="text-xs bg-accent-mist text-accent px-3 py-1.5 rounded-full font-bold hover:bg-accent hover:text-on-accent transition-colors"
                      >
                        设定愿力
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-surface-2 border border-line">
                      <p className="text-xs text-accent font-bold mb-1">个人愿力</p>
                      <p className="text-sm text-ink-2 italic">
                        "{personalVow || t('default_vow_text')}"
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-2 border border-line">
                      <p className="text-xs text-accent font-bold mb-1">众生愿力</p>
                      <p className="text-sm text-ink-2 italic">
                        "{universalVow || t('default_universal_vow')}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* 每日一善 / 八正道 / 禅修智慧引导 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSection('good_deed')}
                    className="bg-surface p-5 rounded-2xl border border-line hover:border-line-strong transition-all group text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-accent-mist text-gold flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink group-hover:text-accent transition-colors">
                        {t('zen_wisdom_card_title')}
                      </h3>
                      <p className="text-xs text-ink-2 mt-1">{t('zen_wisdom_card_desc')}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('eightfold')}
                    className="bg-surface p-5 rounded-2xl border border-line hover:border-line-strong transition-all group text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-accent-mist text-accent flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink group-hover:text-accent transition-colors">
                        {t('eightfold_practice_title')}
                      </h3>
                      <p className="text-xs text-ink-2 mt-1">以八正道印证日常转念与修持</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('wisdom')}
                    className="bg-surface p-5 rounded-2xl border border-line hover:border-line-strong transition-all group text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-accent-mist text-accent flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink group-hover:text-accent transition-colors">
                        禅修智慧引导
                      </h3>
                      <p className="text-xs text-ink-2 mt-1">禅语静心 · AI 禅师智慧对话</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {innerSection === 'setup_vow' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSection('overview')}
                  className="flex items-center gap-2 text-ink-2 hover:text-accent text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <div className="bg-surface p-6 rounded-2xl border border-line space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-accent-mist rounded-full flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-bold font-serif text-xl text-ink">设定我的愿力</h3>
                    <p className="text-xs text-ink-2 mt-1">愿力是修行的方向，也是前行的动力。</p>
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
                      <p className="text-[11px] text-ink-3 mt-1">将显示在顶部，时刻提醒自己。</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">众生愿力</label>
                      <textarea
                        value={universalVow}
                        onChange={(e) => setUniversalVow(e.target.value)}
                        placeholder="例如：愿一切众生离苦得乐..."
                        className="w-full p-4 rounded-2xl bg-surface-2 border border-line text-sm text-ink placeholder:text-ink-3 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none min-h-[100px] resize-none"
                      />
                      <p className="text-[11px] text-ink-3 mt-1">将显示在功德能量地图中，与世界共振。</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveVows}
                    className="w-full bg-accent text-on-accent hover:bg-accent-hover py-4 rounded-2xl font-bold transition-colors"
                  >
                    保存愿力
                  </button>
                </div>
              </div>
            )}

            {innerSection === 'good_deed' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSection('overview')}
                  className="flex items-center gap-2 text-ink-2 hover:text-accent text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <DailyGoodDeed user={user} onLevelUp={onLevelUp} />
              </div>
            )}

            {innerSection === 'eightfold' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSection('overview')}
                  className="flex items-center gap-2 text-ink-2 hover:text-accent text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <EightfoldPractice />
              </div>
            )}

            {innerSection === 'wisdom' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setSection('overview')}
                  className="flex items-center gap-2 text-ink-2 hover:text-accent text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <ZenWisdom />
                <ZenAssistant user={user} onLevelUp={onLevelUp} />
              </div>
            )}
          </motion.div>
        )}

        {activeSegment === 'mind' && (
          <motion.div
            key="segment-mind"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* 转念教练 */}
            <ThoughtCoach />

            {/* 起心动念收集器 */}
            <ThoughtCollector embedded />
          </motion.div>
        )}

        {activeSegment === 'merit' && (
          <motion.div
            key="segment-merit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {historyContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
