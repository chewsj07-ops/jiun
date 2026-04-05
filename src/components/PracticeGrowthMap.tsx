import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Shield, Eye, Heart, Globe, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const levels = [
  {
    id: 1,
    title: '观察念头',
    desc: '觉察内心的起伏，不加评判',
    icon: Eye,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    reqPoints: 0
  },
  {
    id: 2,
    title: '减少情绪反应',
    desc: '面对外境，内心不再轻易波动',
    icon: Shield,
    color: 'text-sky-500',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    reqPoints: 1000
  },
  {
    id: 3,
    title: '稳定觉察',
    desc: '在日常生活中保持正念与专注',
    icon: Target,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    border: 'border-indigo-200',
    reqPoints: 3000
  },
  {
    id: 4,
    title: '增长慈心',
    desc: '对己对人，生起无条件的慈悲',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-100',
    border: 'border-pink-200',
    reqPoints: 6000
  },
  {
    id: 5,
    title: '利益众生',
    desc: '以无我之心，行利他之事',
    icon: Globe,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    reqPoints: 10000
  }
];

export const PracticeGrowthMap = () => {
  const [meritPoints, setMeritPoints] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchPoints = () => {
      const savedExp = localStorage.getItem('zen_user_exp');
      if (savedExp) {
        setMeritPoints(parseInt(savedExp, 10) || 0);
      }
    };
    fetchPoints();
    window.addEventListener('zen_data_updated', fetchPoints);
    window.addEventListener('addExp', fetchPoints);
    return () => {
      window.removeEventListener('zen_data_updated', fetchPoints);
      window.removeEventListener('addExp', fetchPoints);
    };
  }, []);

  const currentLevelIndex = levels.reduce((acc, level, index) => {
    return meritPoints >= level.reqPoints ? index : acc;
  }, 0);

  return (
    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-zen-accent/10 shadow-sm mt-8">
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-6"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="text-xl font-bold font-serif text-zen-ink flex items-center gap-2">
            <Target className="w-5 h-5 text-zen-accent" />
            修行成长图谱
          </h2>
          <p className="text-sm text-zen-ink/60 mt-1">
            见证心境的蜕变，从觉察到利他
          </p>
        </div>
        <button className="p-2 text-zen-ink/40 hover:text-zen-ink rounded-full hover:bg-zen-bg transition-colors">
          <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
        </button>
      </div>

      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 relative"
        >
          {/* Connecting Line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-zen-accent/10 z-0" />

          {levels.map((level, index) => {
          const isUnlocked = index <= currentLevelIndex;
          const isCurrent = index === currentLevelIndex;
          
          return (
            <div key={level.id} className="relative z-10 flex items-start gap-4 group">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                isUnlocked ? level.bg : "bg-zen-bg border border-zen-accent/10",
                isCurrent && "ring-4 ring-offset-2 ring-zen-accent/20"
              )}>
                <level.icon className={cn(
                  "w-5 h-5",
                  isUnlocked ? level.color : "text-zen-accent/30"
                )} />
              </div>
              
              <div className={cn(
                "flex-1 p-4 rounded-2xl border transition-all duration-300",
                isUnlocked ? "bg-white border-zen-accent/10 shadow-sm" : "bg-zen-bg/50 border-transparent opacity-60",
                isCurrent && "border-zen-accent/30 shadow-md"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn(
                    "font-bold text-sm",
                    isUnlocked ? "text-zen-ink" : "text-zen-ink/50"
                  )}>
                    Level {level.id}: {level.title}
                  </h3>
                  {isUnlocked && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zen-accent/60">
                      {isCurrent ? '当前境界' : '已达成'}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs",
                  isUnlocked ? "text-zen-ink/70" : "text-zen-ink/40"
                )}>
                  {level.desc}
                </p>
                
                {isCurrent && index < levels.length - 1 && (
                  <div className="mt-3 pt-3 border-t border-zen-accent/10">
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="text-zen-accent/60 font-bold">距离下一境界</span>
                      <span className="font-mono text-zen-accent">{meritPoints} / {levels[index + 1].reqPoints}</span>
                    </div>
                    <div className="h-1.5 bg-zen-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-zen-accent rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, Math.max(0, ((meritPoints - level.reqPoints) / (levels[index + 1].reqPoints - level.reqPoints)) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </motion.div>
      )}
    </div>
  );
};