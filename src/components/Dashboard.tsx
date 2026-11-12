import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, Sun, Cloud, Moon, Heart, Brain, BookOpen, Clock, 
  ChevronDown, ShieldCheck, Download, Upload, Sparkles, Flame, 
  History, ArrowRight, Check, AlertCircle 
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';
import { practiceService } from '../services/practiceService';
import { recordVault, PracticeRecord } from '../services/recordVault';
import { safeStorage } from '../utils/safeStorage';
import { DailyZenQuote } from './DailyZenQuote';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [vaultStatusMsg, setVaultStatusMsg] = useState<string | null>(null);

  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(true);

  // Load and refresh practice statistics
  const fetchAllStats = async () => {
    const todayStr = new Date().toDateString();

    // 1. History & Check-in records from recordVault
    const records = await recordVault.getRecords();
    setTotalRecordsCount(records.length);

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

  // Export records JSON backup
  const handleExportBackup = async () => {
    try {
      const records = await recordVault.getRecords();
      const json = recordVault.exportBackupJSON(records);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `VowZen_打卡记录备份_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setVaultStatusMsg('✅ 备份导出成功！打卡记录已安全保存为本地文件。');
      setTimeout(() => setVaultStatusMsg(null), 4000);
    } catch (e) {
      setVaultStatusMsg('❌ 导出备份失败，请稍后再试。');
      setTimeout(() => setVaultStatusMsg(null), 4000);
    }
  };

  // Import records JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const imported = recordVault.importBackupJSON(content);
      if (imported && imported.length > 0) {
        await recordVault.saveRecords(imported);
        safeStorage.setJSON('zen_history', imported);
        window.dispatchEvent(new CustomEvent('zen_data_updated'));
        fetchAllStats();
        setVaultStatusMsg(`✅ 成功从备份恢复 ${imported.length} 条打卡记录！`);
        setTimeout(() => setVaultStatusMsg(null), 4000);
      } else {
        setVaultStatusMsg('❌ 备份文件格式不正确，无法读取记录。');
        setTimeout(() => setVaultStatusMsg(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto w-full space-y-6 pb-16 px-1"
    >
      {/* 1. Daily Zen Wisdom Quote */}
      <DailyZenQuote />

      {/* 2. Today's Practice Check-in Hub (今日修行打卡看板) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-zen-accent/10 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-bold font-serif text-zen-ink">
                今日修行打卡
              </h2>
            </div>
            <p className="text-xs text-zen-ink/60 mt-1">
              日日行持，功不唐捐 · 累计修习中
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200/60 text-amber-800 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>连续修持 {streakDays} 天</span>
          </div>
        </div>

        {/* 4 Core Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div 
            onClick={() => onNavigate?.('fish')}
            className="cursor-pointer bg-gradient-to-br from-amber-50/60 to-white p-3.5 rounded-2xl border border-amber-100/70 hover:shadow-sm transition-all"
          >
            <div className="text-[11px] font-semibold text-amber-800/70 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-amber-600 fill-current" />
              木鱼念诵
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-amber-900">
              {todayChantCount}
              <span className="text-xs font-normal text-amber-700/60 ml-1">次</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigate?.('meditation')}
            className="cursor-pointer bg-gradient-to-br from-sky-50/60 to-white p-3.5 rounded-2xl border border-sky-100/70 hover:shadow-sm transition-all"
          >
            <div className="text-[11px] font-semibold text-sky-800/70 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              禅修入定
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-sky-900">
              {todayMeditationMins}
              <span className="text-xs font-normal text-sky-700/60 ml-1">分钟</span>
            </div>
          </div>

          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-good-deed-collector'))}
            className="cursor-pointer bg-gradient-to-br from-pink-50/60 to-white p-3.5 rounded-2xl border border-pink-100/70 hover:shadow-sm transition-all"
          >
            <div className="text-[11px] font-semibold text-pink-800/70 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-600" />
              行善积德
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-pink-900">
              {todayDeedsCount}
              <span className="text-xs font-normal text-pink-700/60 ml-1">件</span>
            </div>
          </div>

          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-thought-collector'))}
            className="cursor-pointer bg-gradient-to-br from-indigo-50/60 to-white p-3.5 rounded-2xl border border-indigo-100/70 hover:shadow-sm transition-all"
          >
            <div className="text-[11px] font-semibold text-indigo-800/70 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              正念觉察
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-indigo-900">
              {todayThoughtsCount}
              <span className="text-xs font-normal text-indigo-700/60 ml-1">条</span>
            </div>
          </div>
        </div>

        {/* 3 Large Zen Action Buttons (Easy Touch Zone) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate?.('fish')}
            className="flex items-center justify-between p-3.5 bg-zen-accent text-white rounded-2xl shadow-sm hover:opacity-95 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm">敲木鱼念诵</div>
              <div className="text-[11px] text-white/80">静心持咒 · 功德+1</div>
            </div>
            <Heart className="w-5 h-5 fill-current shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.('meditation')}
            className="flex items-center justify-between p-3.5 bg-zen-accent/10 hover:bg-zen-accent/15 text-zen-ink rounded-2xl border border-zen-accent/15 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm text-zen-accent">入静禅修</div>
              <div className="text-[11px] text-zen-ink/60">数息定心 · 止语内观</div>
            </div>
            <Clock className="w-5 h-5 text-zen-accent shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.('history')}
            className="flex items-center justify-between p-3.5 bg-zen-bg/70 hover:bg-zen-bg text-zen-ink rounded-2xl border border-zen-accent/15 transition-all text-left"
          >
            <div>
              <div className="font-bold text-sm text-zen-ink">功德打卡簿</div>
              <div className="text-[11px] text-zen-ink/60">查看记录 ({totalRecordsCount}条)</div>
            </div>
            <History className="w-5 h-5 text-zen-accent shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Check-in Records Vault Security Card (打卡记录双重持久化永久保障) */}
      <div className="bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 rounded-[32px] p-6 sm:p-7 border border-emerald-200/60 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950 font-serif">
                  打卡记录永久金库
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  双重持久化
                </span>
              </div>
              <p className="text-xs text-emerald-900/70 mt-1 leading-relaxed">
                您的修持记录已由 SafeStorage 与 IndexedDB 永久金库双重保存，即便浏览器清理缓存或重启也不会丢失，随时支持导出与导入。
              </p>
              <div className="mt-2 text-xs font-semibold text-emerald-800">
                当前已安全归档：<span className="font-serif text-sm font-bold text-emerald-950">{totalRecordsCount}</span> 条修持打卡记录
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleExportBackup}
              title="下载打卡记录备份文件"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>导出备份 (JSON)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="从本地备份文件恢复"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>导入恢复</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              className="hidden" 
            />
          </div>
        </div>

        {/* Feedback message banner */}
        {vaultStatusMsg && (
          <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-300 text-xs text-emerald-900 font-medium animate-fade-in flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{vaultStatusMsg}</span>
          </div>
        )}
      </div>

      {/* 4. Daily Routine Workflow (今日修行安排) */}
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
