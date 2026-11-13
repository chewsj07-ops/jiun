import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Trophy, Sparkles, Heart, Brain, HandHeart } from 'lucide-react';
import { useTranslation } from '../i18n';
import { practiceService } from '../services/practiceService';
import { DailyPractice, PRACTICE_WEIGHTS, PracticeActivityType } from '../types/practice';
import { cn } from '../lib/utils';

export const PracticeProgress = () => {
  const { t } = useTranslation();
  // Force update to get fresh data
  const [practice, setPractice] = useState<DailyPractice>(practiceService.getDailyPractice());
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(practiceService.getLevel());

  const refreshData = () => {
    const p = practiceService.getDailyPractice();
    setPractice(p);
    setProgress(practiceService.calculateProgress(p));
    setLevel(practiceService.getLevel());
  };

  useEffect(() => {
    refreshData();
    // Set up an interval to check for updates (e.g. from other components)
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = (type: PracticeActivityType, value: number | boolean) => {
    // For incrementing types, we pass 1. For boolean types, we pass the new boolean value.
    if (typeof value === 'number') {
        practiceService.updateActivity(type, 1);
        practiceService.logMerit(type); // Log merit for manual increment
    } else {
        practiceService.updateActivity(type, value);
        if (value === true) {
            practiceService.logMerit(type); // Log merit only when toggled ON
        }
    }
    refreshData();
  };

  const renderItem = (
    type: PracticeActivityType, 
    Icon: React.ElementType,
    label: string, 
    current: number | boolean, 
    target: number | boolean, 
    isManual: boolean = false
  ) => {
    const isCompleted = typeof target === 'boolean' ? (current as boolean) : (current as number) >= (target as number);
    const weight = PRACTICE_WEIGHTS[type];
    const displayValue = typeof current === 'boolean' 
      ? (current ? t('completed') || 'Done' : t('pending') || 'Pending') 
      : `${current} / ${target}`;

    return (
      <div className="flex items-center justify-between py-3 border-b border-line last:border-0 group">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
            isCompleted ? "bg-accent text-on-accent scale-105" : "bg-surface-2 text-ink-3"
          )}>
            {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-ink group-hover:text-accent transition-colors">{label}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-2 uppercase tracking-wider font-bold bg-surface-2 px-1.5 py-0.5 rounded-md">
                {weight}%
              </span>
              <span className="text-[10px] text-ink-3">
                {typeof target === 'number' && !isCompleted ? `${Math.min(current as number, target)}/${target}` : ''}
              </span>
            </div>
          </div>
        </div>
        
        {isManual && (
          <button
            onClick={() => handleUpdate(type, typeof target === 'number' ? 1 : !current)}
            className={cn(
              "w-8 h-8 rounded-full transition-all flex items-center justify-center",
              typeof target === 'boolean' && isCompleted 
                ? "bg-accent text-on-accent hover:bg-accent-hover" 
                : "bg-accent-mist hover:bg-accent text-accent hover:text-on-accent"
            )}
          >
            {typeof target === 'boolean' && isCompleted ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="bg-surface p-6 rounded-2xl border border-line space-y-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-mist rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-accent" />
            <h3 className="text-lg font-bold font-serif text-ink">{t('practice_progress_title')}</h3>
          </div>
          <p className="text-xs text-ink-2 uppercase tracking-widest font-bold pl-6">
            {t('practice_level')} {level.level} • {t(level.nameKey as any)}
          </p>
        </div>
        
        {/* Progress Ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Track */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-line"
            />
            {/* Indicator */}
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 28}
              initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 28) - (progress / 100) * (2 * Math.PI * 28) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
              className="text-accent"
            />
          </svg>
          <span className="absolute text-xs font-bold text-accent">{progress}%</span>
        </div>
      </div>

      <div className="bg-surface-2 p-4 rounded-2xl">
        <p className="text-xs text-ink-2 italic text-center leading-relaxed">
          "{t('practice_reminder')}"
        </p>
      </div>

      <div className="space-y-1">
        {renderItem('chanting', Sparkles, t('practice_chanting'), practice.chanting, 108, false)}
        {renderItem('meditation', Brain, t('practice_meditation'), practice.meditation, 15, false)}
        {renderItem('observing_thoughts', Brain, t('practice_observing_thoughts'), practice.observing_thoughts, 3, false)}
        {renderItem('rejoicing', Heart, t('practice_rejoicing'), practice.rejoicing, 1, false)}
        {renderItem('good_deeds', HandHeart, t('practice_good_deeds'), practice.good_deeds, 1, false)}
        {renderItem('dedication', Heart, t('practice_dedication'), practice.dedication, true, false)}
        {renderItem('full_dedication', Sparkles, t('practice_full_dedication'), practice.full_dedication, true, false)}
      </div>
    </div>
  );
};
