import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sun, Cloud, Moon, Heart, Brain, BookOpen, Book, Clock, 
  ChevronDown, Flame, History, Check, CheckCircle
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';
import { practiceService } from '../services/practiceService';
import { recordVault } from '../services/recordVault';
import { safeStorage } from '../utils/safeStorage';
import { DailyZenQuote } from './DailyZenQuote';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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
  const [todayChantCount, setTodayChantCount] = useState(0);
  const [todayMeditationMins, setTodayMeditationMins] = useState(0);
  const [todayTotalMerit, setTodayTotalMerit] = useState(0);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const [streakDays, setStreakDays] = useState(1);
  const [practicedDates, setPracticedDates] = useState<Set<string>>(new Set());

  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(true);

  // Load and refresh practice statistics
  const fetchAllStats = async () => {
    const todayStr = new Date().toDateString();

    // 1. History & Check-in records from recordVault
    const records = await recordVault.getRecords();
    setTotalRecordsCount(records.length);

    const pDates = new Set<string>();
    records.forEach(h => {
      const ts = h.endTime || h.timestamp || h.startTime || Number(h.id);
      if (ts) {
        pDates.add(new Date(ts).toDateString());
      }
    });
    setPracticedDates(pDates);

    const todayItems = records.filter(h => {
      const ts = h.endTime || h.timestamp || h.startTime || Number(h.id);
      return ts && new Date(ts).toDateString() === todayStr;
    });

    const chants = todayItems
      .filter(h => h.type !== '禅修')
      .reduce((sum, h) => sum + (h.count || 0), 0);
    setTodayChantCount(chants);

    const medSecs = todayItems
      .filter(h => h.type === '禅修')
      .reduce((sum, h) => sum + (h.duration || 0), 0);
    setTodayMeditationMins(Math.max(0, Math.round(medSecs / 60)));

    const meritSum = todayItems.reduce((sum, h) => sum + (h.count || 0), 0);
    setTodayTotalMerit(meritSum);

    // Calculate streak
    if (records.length > 0) {
      const dates = records.map(h => {
        const ts = h.startTime || h.endTime || h.timestamp || h.id;
        return ts ? new Date(ts).toDateString() : null;
      }).filter(Boolean) as string[];
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      let checkDate = new Date();
      if (uniqueDates[0] === checkDate.toDateString()) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (uniqueDates[0] === yesterday.toDateString()) {
          streak = 1;
          checkDate = yesterday;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      for (let i = 1; i < uniqueDates.length; i++) {
        if (new Date(uniqueDates[i]).toDateString() === checkDate.toDateString()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStreakDays(Math.max(1, streak));
    }

    // 2. Thoughts count
    const savedThoughts = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const todayThoughts = savedThoughts.filter((item: any) => 
      new Date(item.timestamp || item.id).toDateString() === todayStr
    );
    setTodayThoughtsCount(todayThoughts.length);

    // 3. Good deeds count
    const savedDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
    const todayDeeds = savedDeeds.filter((d: any) => {
      const isToday = new Date(d.date || d.timestamp).toDateString() === todayStr;
      const isChanting = d.content && (d.content.includes('念诵') || d.content.includes('禅修'));
      return isToday && !isChanting;
    });
    setTodayDeedsCount(todayDeeds.length);
  };

  useEffect(() => {
    // Workflow restoration
    const savedWorkflow = safeStorage.getJSON<any>('zen_workflow', null);
    if (savedWorkflow) {
      if (savedWorkflow.date === new Date().toDateString()) {
        setWorkflowState(savedWorkflow.state);
      } else {
        setWorkflowState(prev => ({ ...prev, morning: false, goodDeed: false, mindfulness: false, evening: false, eveningClass: false }));
      }
    } else {
      const practice = practiceService.getDailyPractice();
      setWorkflowState(prev => ({ ...prev, eveningClass: practice.evening_class }));
    }

    fetchAllStats();

    window.addEventListener('storage', fetchAllStats);
    window.addEventListener('addExp', fetchAllStats);
    window.addEventListener('zen_data_updated', fetchAllStats);

    return () => {
      window.removeEventListener('storage', fetchAllStats);
      window.removeEventListener('addExp', fetchAllStats);
      window.removeEventListener('zen_data_updated', fetchAllStats);
    };
  }, []);

  useEffect(() => {
    safeStorage.setJSON('zen_workflow', {
      date: new Date().toDateString(),
      state: workflowState
    });
  }, [workflowState]);

  const toggleWorkflow = (key: keyof typeof workflowState) => {
    setWorkflowState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate 7 days for the current week (Monday to Sunday)
  const getWeekDays = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return labels.map((label, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateStr = d.toDateString();
      const isToday = dateStr === now.toDateString();
      const isPast = d < now && !isToday;
      const isFuture = d > now && !isToday;
      const hasPracticed = practicedDates.has(dateStr);
      return {
        label,
        dateNum: d.getDate(),
        fullDate: d,
        isToday,
        isPast,
        isFuture,
        hasPracticed
      };
    });
  };

  const weekDaysList = getWeekDays();
  const weekPracticedCount = weekDaysList.filter(d => d.hasPracticed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto w-full space-y-6 pb-16 px-1"
    >
      {/* 1. Daily Zen Wisdom Quote */}
      <DailyZenQuote />

      {/* 2. Weekly Practice Check-in Strip (本周修行打卡 - 一周打卡视图，简洁纯净不冗余) */}
      <div className="bg-white rounded-[32px] p-5 sm:p-7 border border-zen-accent/10 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold font-serif text-zen-ink">
                本周修持打卡
              </h2>
            </div>
            <p className="text-xs text-zen-ink/60 mt-0.5">
              本周已践行 {weekPracticedCount} / 7 天 · 步步踏实
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200/60 text-amber-900 text-xs font-bold">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>连续打卡 {streakDays} 天</span>
          </div>
        </div>

        {/* 7-Day Weekly Grid (周一至周日) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-5">
          {weekDaysList.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all border text-center select-none",
                day.isToday
                  ? "bg-amber-50/70 border-amber-300 shadow-2xs"
                  : day.hasPracticed
                  ? "bg-emerald-50/40 border-emerald-200/70"
                  : "bg-zen-bg/30 border-zen-accent/5 opacity-70"
              )}
            >
              <span className={cn(
                "text-[10px] sm:text-xs font-medium mb-1.5",
                day.isToday ? "text-amber-900 font-bold" : "text-zen-ink/60"
              )}>
                {day.label}
              </span>

              {/* Status Circle */}
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                day.hasPracticed
                  ? "bg-emerald-500 text-white shadow-xs"
                  : day.isToday
                  ? "bg-amber-100 text-amber-800 border-2 border-dashed border-amber-400 animate-pulse"
                  : "bg-white/80 text-zen-ink/30 border border-zen-accent/15"
              )}>
                {day.hasPracticed ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : day.isToday ? (
                  <span className="text-[10px]">今</span>
                ) : (
                  <span className="text-[10px] text-zen-ink/40">{day.dateNum}</span>
                )}
              </div>

              <span className={cn(
                "text-[9px] mt-1.5 tracking-tight font-medium",
                day.hasPracticed 
                  ? "text-emerald-700 font-semibold" 
                  : day.isToday 
                  ? "text-amber-800 font-bold" 
                  : "text-zen-ink/40"
              )}>
                {day.hasPracticed ? "已打卡" : day.isToday ? "待修持" : `${day.dateNum}日`}
              </span>
            </div>
          ))}
        </div>

        {/* 4 Large Zen Action Buttons (Easy Touch Zone) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigate?.('fish')}
            className="flex items-center justify-between p-3.5 bg-zen-accent text-white rounded-2xl shadow-xs hover:opacity-95 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm">敲木鱼打卡</div>
              <div className="text-[11px] text-white/80">静心持咒 · 功德+1</div>
            </div>
            <Heart className="w-4 h-4 fill-current shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.('scripture')}
            className="flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100/80 text-amber-950 rounded-2xl border border-amber-200/70 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm text-amber-900">经文数据库</div>
              <div className="text-[11px] text-amber-800/70">原文 · 拼音 · 释义</div>
            </div>
            <Book className="w-4 h-4 text-amber-700 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.('meditation')}
            className="flex items-center justify-between p-3.5 bg-zen-accent/10 hover:bg-zen-accent/15 text-zen-ink rounded-2xl border border-zen-accent/15 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm text-zen-accent">禅修静心</div>
              <div className="text-[11px] text-zen-ink/60">数息定心 · 止语内观</div>
            </div>
            <Clock className="w-4 h-4 text-zen-accent shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.('history')}
            className="flex items-center justify-between p-3.5 bg-zen-bg/70 hover:bg-zen-bg text-zen-ink rounded-2xl border border-zen-accent/15 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm text-zen-ink">功德打卡簿</div>
              <div className="text-[11px] text-zen-ink/60">查看明细 ({totalRecordsCount}条)</div>
            </div>
            <History className="w-4 h-4 text-zen-accent shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Daily Routine Workflow (今日修行安排) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-zen-accent/10 shadow-sm">
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-zen-ink flex items-center gap-2">
              <Sun className="w-5 h-5 text-zen-accent" />
              修行日常安排 (Daily Workflow)
            </h2>
            <p className="text-xs sm:text-sm text-zen-ink/60 mt-1">
              清晨觉醒 · 生活禅行 · 回向微省
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
            className="relative mt-7 space-y-6"
          >
            {/* Morning Module */}
            <div className="flex gap-3">
              <div 
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-300 mt-1",
                  workflowState.morning ? "bg-amber-100 text-amber-600" : "bg-white border-2 border-amber-200 text-amber-400"
                )}
              >
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-amber-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-100/60 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-serif text-amber-900 leading-tight">
                      {t('morning_routine')}
                    </h3>
                    <p className="text-amber-800/60 text-xs mt-0.5">
                      {t('morning_routine_desc')}
                    </p>
                  </div>
                  <button 
                    onClick={() => toggleWorkflow('morning')}
                    title="标记为完成"
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
                      workflowState.morning ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-400 hover:bg-amber-200"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onNavigate?.('fish')}
                    className="flex-1 py-2 px-3 bg-white rounded-xl border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('morning_chant')}</span>
                  </button>
                  <button 
                    onClick={() => onNavigate?.('meditation')}
                    className="flex-1 py-2 px-3 bg-white rounded-xl border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('morning_meditation')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Daytime Module */}
            <div className="flex gap-3">
              <div 
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-300 mt-1",
                  (workflowState.goodDeed && workflowState.mindfulness) ? "bg-sky-100 text-sky-600" : "bg-white border-2 border-sky-200 text-sky-400"
                )}
              >
                <Cloud className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-sky-50/40 to-white p-4 sm:p-5 rounded-2xl border border-sky-100/60 shadow-xs">
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-bold font-serif text-sky-900 leading-tight">
                    {t('daily_zen')}
                  </h3>
                  <p className="text-sky-800/60 text-xs mt-0.5">
                    {t('daily_zen_desc')}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-sky-100">
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('open-good-deed-collector'))}
                      className="flex items-center gap-2.5 text-left flex-1"
                    >
                      <div className="p-1.5 bg-pink-50 text-pink-500 rounded-lg shrink-0">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-sky-950">{t('random_good_deed')}</div>
                        <div className="text-[10px] text-sky-700/60">今日已记 {todayDeedsCount} 次</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => toggleWorkflow('goodDeed')}
                      title="标记为完成"
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        workflowState.goodDeed ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-400 hover:bg-sky-200"
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-sky-100">
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('open-thought-collector'))}
                      className="flex items-center gap-2.5 text-left flex-1"
                    >
                      <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-sky-950">{t('mindful_moment')}</div>
                        <div className="text-[10px] text-sky-700/60">今日已察 {todayThoughtsCount} 条</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => toggleWorkflow('mindfulness')}
                      title="标记为完成"
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        workflowState.mindfulness ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-400 hover:bg-sky-200"
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Evening Module */}
            <div className="flex gap-3">
              <div 
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-300 mt-1",
                  workflowState.evening ? "bg-indigo-100 text-indigo-600" : "bg-white border-2 border-indigo-200 text-indigo-400"
                )}
              >
                <Moon className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-indigo-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-100/60 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-serif text-indigo-900 leading-tight">
                      {t('evening_reflection')}
                    </h3>
                    <p className="text-indigo-800/60 text-xs mt-0.5">
                      {t('evening_reflection_desc')}
                    </p>
                  </div>
                  <button 
                    onClick={() => toggleWorkflow('evening')}
                    title="标记为完成"
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
                      workflowState.evening ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-400 hover:bg-indigo-200"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onNavigate?.('fish')}
                    className="flex-1 py-2 px-3 bg-white rounded-xl border border-indigo-200 text-indigo-800 text-xs font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>晚课诵经</span>
                  </button>
                  <button 
                    onClick={() => onNavigate?.('vow')}
                    className="flex-1 py-2 px-3 bg-white rounded-xl border border-indigo-200 text-indigo-800 text-xs font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>普皆回向</span>
                  </button>
                  <button 
                    onClick={() => onNavigate?.('meditation')}
                    className="flex-1 py-2 px-3 bg-white rounded-xl border border-indigo-200 text-indigo-800 text-xs font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>安眠静心</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
