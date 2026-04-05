import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Sun, Cloud, Moon, Heart, Brain, BookOpen, Clock, ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';
import { PracticeGrowthMap } from './PracticeGrowthMap';
import { practiceService } from '../services/practiceService';

export const Dashboard = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const { t } = useTranslation();
  
  // Workflow states
  const [workflowState, setWorkflowState] = useState({
    morning: false,
    goodDeed: false,
    mindfulness: false,
    evening: false,
    eveningClass: false
  });

  const [todayThoughtsCount, setTodayThoughtsCount] = useState(0);
  const [todayDeedsCount, setTodayDeedsCount] = useState(0);

  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(true);

  useEffect(() => {
    const savedWorkflow = localStorage.getItem('zen_workflow');
    if (savedWorkflow) {
      const parsed = JSON.parse(savedWorkflow);
      // Reset if it's a new day
      if (parsed.date === new Date().toDateString()) {
        setWorkflowState(parsed.state);
      } else {
        // If it's a new day, we need to make sure eveningClass is also reset
        setWorkflowState(prev => ({ ...prev, eveningClass: false }));
      }
    } else {
      // Initialize from practiceService if no saved workflow
      const practice = practiceService.getDailyPractice();
      setWorkflowState(prev => ({ ...prev, eveningClass: practice.evening_class }));
    }

    const fetchCounts = () => {
      const todayStr = new Date().toDateString();
      
      const savedThoughts = localStorage.getItem('zen_thoughts');
      if (savedThoughts) {
        try {
          const thoughts = JSON.parse(savedThoughts);
          const todayThoughts = thoughts.filter((t: any) => new Date(t.timestamp || t.id).toDateString() === todayStr);
          setTodayThoughtsCount(todayThoughts.length);
        } catch (e) {}
      }

      const savedDeeds = localStorage.getItem('good_deed_history');
      if (savedDeeds) {
        try {
          const deeds = JSON.parse(savedDeeds);
          const todayDeeds = deeds.filter((d: any) => {
            const isToday = new Date(d.date || d.timestamp).toDateString() === todayStr;
            const isChanting = d.content && (d.content.includes('念诵') || d.content.includes('禅修'));
            return isToday && !isChanting;
          });
          setTodayDeedsCount(todayDeeds.length);
        } catch (e) {}
      }
    };

    fetchCounts();
    
    window.addEventListener('storage', fetchCounts);
    window.addEventListener('addExp', fetchCounts);
    window.addEventListener('zen_data_updated', fetchCounts);
    
    return () => {
      window.removeEventListener('storage', fetchCounts);
      window.removeEventListener('addExp', fetchCounts);
      window.removeEventListener('zen_data_updated', fetchCounts);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('zen_workflow', JSON.stringify({
      date: new Date().toDateString(),
      state: workflowState
    }));
  }, [workflowState]);

  const toggleWorkflow = (key: keyof typeof workflowState) => {
    setWorkflowState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto w-full space-y-8 pb-12"
    >
      {/* Workflow Timeline */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-zen-accent/10 shadow-sm mt-8">
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
        >
          <div>
            <h2 className="text-xl font-bold font-serif text-zen-ink flex items-center gap-2">
              <Sun className="w-5 h-5 text-zen-accent" />
              今日修行 (Daily Practice)
            </h2>
            <p className="text-sm text-zen-ink/60 mt-1">
              清晨觉醒 - 生活禅 - 回向总结
            </p>
          </div>
          <button className="p-2 text-zen-ink/40 hover:text-zen-ink rounded-full hover:bg-zen-bg transition-colors">
            <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isWorkflowExpanded ? "rotate-180" : "")} />
          </button>
        </div>

        {isWorkflowExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative mt-8"
          >
            {/* Vertical Line */}
            <div className="absolute left-[11px] sm:left-[15px] top-8 bottom-8 w-0.5 bg-zen-accent/10" />

            <div className="space-y-6 sm:space-y-8">
              {/* Morning Module */}
              <div className="relative flex gap-1.5 sm:gap-3">
                <div 
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500 mt-1 sm:mt-1.5",
                    workflowState.morning ? "bg-amber-100 text-amber-600 shadow-inner" : "bg-white border-2 border-amber-100 text-amber-300"
                  )}
                  title="清晨觉醒"
                >
                  <Sun className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1 min-w-0 bg-gradient-to-br from-amber-50/50 to-white p-3 sm:p-5 rounded-[20px] sm:rounded-[28px] border border-amber-100/50 shadow-sm">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="text-base sm:text-lg font-bold font-serif text-amber-900 leading-tight">{t('morning_routine')}</h3>
                      <p className="text-amber-700/60 text-xs sm:p-sm mt-1 leading-snug">{t('morning_routine_desc')}</p>
                    </div>
                    <button 
                      onClick={() => toggleWorkflow('morning')}
                      title="标记为完成"
                      className={cn(
                        "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                        workflowState.morning ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-400 hover:bg-amber-200"
                      )}
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <div className="flex flex-row gap-2">
                    <button 
                      onClick={() => onNavigate?.('fish')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 px-2 sm:px-4 bg-white rounded-xl sm:rounded-2xl border border-amber-100 text-amber-700 text-xs sm:text-sm font-medium hover:bg-amber-50 transition-colors min-w-0"
                      title={t('morning_chant')}
                    >
                      <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t('morning_chant')}</span>
                    </button>
                    <button 
                      onClick={() => onNavigate?.('meditation')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 px-2 sm:px-4 bg-white rounded-xl sm:rounded-2xl border border-amber-100 text-amber-700 text-xs sm:text-sm font-medium hover:bg-amber-50 transition-colors min-w-0"
                      title={t('morning_meditation')}
                    >
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t('morning_meditation')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Day Module */}
              <div className="relative flex gap-1.5 sm:gap-3">
                <div 
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500 mt-1 sm:mt-1.5",
                    (workflowState.goodDeed && workflowState.mindfulness) ? "bg-sky-100 text-sky-600 shadow-inner" : "bg-white border-2 border-sky-100 text-sky-300"
                  )}
                  title="生活禅"
                >
                  <Cloud className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1 min-w-0 bg-gradient-to-br from-sky-50/50 to-white p-3 sm:p-5 rounded-[20px] sm:rounded-[28px] border border-sky-100/50 shadow-sm">
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-bold font-serif text-sky-900 leading-tight">{t('daily_zen')}</h3>
                    <p className="text-sky-700/60 text-xs sm:text-sm mt-1 leading-snug">{t('daily_zen_desc')}</p>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-sky-100">
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-good-deed-collector'))}
                        className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
                        title={t('random_good_deed')}
                      >
                        <div className="p-1.5 sm:p-2 bg-pink-50 text-pink-500 rounded-lg sm:rounded-xl shrink-0">
                          <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-sky-900 leading-tight">{t('random_good_deed')}</div>
                          <div className="text-[10px] sm:text-xs text-sky-700/60 leading-tight mt-0.5">{t('recorded_today')}{todayDeedsCount} {t('counts')}</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => toggleWorkflow('goodDeed')}
                        title="标记为完成"
                        className={cn(
                          "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-1 sm:ml-2",
                          workflowState.goodDeed ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-400 hover:bg-sky-200"
                        )}
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-sky-100">
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-thought-collector'))}
                        className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
                        title={t('mindful_moment')}
                      >
                        <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-500 rounded-lg sm:rounded-xl shrink-0">
                          <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-sky-900 leading-tight">{t('mindful_moment')}</div>
                          <div className="text-[10px] sm:text-xs text-sky-700/60 leading-tight mt-0.5">{t('recorded_today')}{todayThoughtsCount} {t('counts')}</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => toggleWorkflow('mindfulness')}
                        title="标记为完成"
                        className={cn(
                          "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-1 sm:ml-2",
                          workflowState.mindfulness ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-400 hover:bg-sky-200"
                        )}
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evening Module */}
              <div className="relative flex gap-1.5 sm:gap-3">
                <div 
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500 mt-1 sm:mt-1.5",
                    workflowState.evening ? "bg-indigo-100 text-indigo-600 shadow-inner" : "bg-white border-2 border-indigo-100 text-indigo-300"
                  )}
                  title="回向总结"
                >
                  <Moon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1 min-w-0 bg-gradient-to-br from-indigo-50/50 to-white p-3 sm:p-5 rounded-[20px] sm:rounded-[28px] border border-indigo-100/50 shadow-sm">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="text-base sm:text-lg font-bold font-serif text-indigo-900 leading-tight">{t('evening_reflection')}</h3>
                      <p className="text-indigo-700/60 text-xs sm:text-sm mt-1 leading-snug">{t('evening_reflection_desc')}</p>
                    </div>
                    <button 
                      onClick={() => toggleWorkflow('evening')}
                      title="标记为完成"
                      className={cn(
                        "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                        workflowState.evening ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-400 hover:bg-indigo-200"
                      )}
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <div className="flex flex-row gap-2">
                    <button 
                      onClick={() => onNavigate?.('fish')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 px-2 sm:px-4 bg-white rounded-xl sm:rounded-2xl border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium hover:bg-indigo-50 transition-colors min-w-0"
                      title="晚课"
                    >
                      <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">晚课</span>
                    </button>
                    <button 
                      onClick={() => onNavigate?.('vow')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 px-2 sm:px-4 bg-white rounded-xl sm:rounded-2xl border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium hover:bg-indigo-50 transition-colors min-w-0"
                      title={t('evening_chant')}
                    >
                      <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t('evening_chant')}</span>
                    </button>
                    <button 
                      onClick={() => onNavigate?.('meditation')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 px-2 sm:px-4 bg-white rounded-xl sm:rounded-2xl border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium hover:bg-indigo-50 transition-colors min-w-0"
                      title={t('sleep_meditation')}
                    >
                      <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t('sleep_meditation')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>



  {/* Practice Growth Map */}
      {/* <PracticeGrowthMap /> */}
    </motion.div>
  );
}; 
