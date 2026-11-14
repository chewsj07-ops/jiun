import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Scripture } from '../constants';
import { DailyPractice, DailyPracticeItem } from '../types/practice';
import {
  getPracticeDateKey,
  isSamePracticeDay,
  practiceService,
} from '../services/practiceService';
import { ritualService } from '../services/ritualService';
import {
  DailyPathNextAction,
  getDailyPath,
} from '../services/dailyPath';
import { recordVault } from '../services/recordVault';
import { safeStorage } from '../utils/safeStorage';
import { DailyZenQuote } from './DailyZenQuote';
import { DailyPathCard, DailyPathWorkflowState } from './DailyPathCard';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
  onNextAction?: (next: DailyPathNextAction) => void;
  personalVow?: string;
  scriptures?: Scripture[];
  dailyPracticeList?: DailyPracticeItem[];
  dailyPractice?: DailyPractice;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onNextAction,
  personalVow: personalVowProp,
  scriptures = [],
  dailyPracticeList: dailyPracticeListProp,
  dailyPractice: dailyPracticeProp,
}) => {
  const [workflowState, setWorkflowState] = useState<DailyPathWorkflowState>({
    morning: false,
    goodDeed: false,
    mindfulness: false,
    evening: false,
    eveningClass: false,
  });

  const [localPersonalVow, setLocalPersonalVow] = useState<string>(
    () => safeStorage.getItem('personal_vow') || ''
  );
  const effectiveVow = (
    personalVowProp !== undefined ? personalVowProp : localPersonalVow
  ).trim();

  const [localPractice, setLocalPractice] = useState<DailyPractice>(() =>
    practiceService.getDailyPractice()
  );
  const [localPracticeList, setLocalPracticeList] = useState<DailyPracticeItem[]>(
    () => practiceService.getDailyPracticeList(scriptures)
  );
  const [ritualPreDone, setRitualPreDone] = useState<boolean>(
    () => ritualService.getDailyState().completedPreRitual
  );

  const [todayThoughtsCount, setTodayThoughtsCount] = useState(0);
  const [todayDeedsCount, setTodayDeedsCount] = useState(0);
  const [practicedDates, setPracticedDates] = useState<Set<string>>(new Set());
  const [clockTick, setClockTick] = useState(() => Date.now());

  const activePractice = dailyPracticeProp || localPractice;
  const activePracticeList = dailyPracticeListProp || localPracticeList;

  const fetchAllStats = async () => {
    const now = new Date();

    const records = await recordVault.getRecords();
    const pDates = new Set<string>();
    records.forEach((h) => {
      const ts = h.endTime || h.timestamp || h.startTime || Number(h.id);
      if (ts) {
        pDates.add(new Date(ts).toDateString());
      }
    });
    setPracticedDates(pDates);

    const savedThoughts = safeStorage.getJSON<any[]>('zen_thoughts', []);
    const todayThoughts = savedThoughts.filter((item: any) =>
      isSamePracticeDay(item.timestamp || item.id, now)
    );
    setTodayThoughtsCount(todayThoughts.length);

    const savedDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
    const todayDeeds = savedDeeds.filter((d: any) => {
      const isToday = isSamePracticeDay(d.date || d.timestamp, now);
      const isChanting =
        d.content && (d.content.includes('念诵') || d.content.includes('禅修'));
      return isToday && !isChanting;
    });
    setTodayDeedsCount(todayDeeds.length);

    setLocalPractice(practiceService.getDailyPractice());
    setLocalPracticeList(practiceService.getDailyPracticeList(scriptures));
    setRitualPreDone(ritualService.getDailyState().completedPreRitual);
    setClockTick(Date.now());
  };

  useEffect(() => {
    const practiceDateKey = getPracticeDateKey();
    const savedWorkflow = safeStorage.getJSON<any>('zen_workflow', null);
    if (savedWorkflow) {
      if (
        savedWorkflow.practiceDate === practiceDateKey ||
        (!savedWorkflow.practiceDate &&
          savedWorkflow.date === new Date().toDateString())
      ) {
        setWorkflowState(savedWorkflow.state);
      } else {
        setWorkflowState((prev) => ({
          ...prev,
          morning: false,
          goodDeed: false,
          mindfulness: false,
          evening: false,
          eveningClass: false,
        }));
      }
    } else {
      const practice = practiceService.getDailyPractice();
      setWorkflowState((prev) => ({
        ...prev,
        eveningClass: practice.evening_class,
      }));
    }

    const syncVow = () =>
      setLocalPersonalVow(safeStorage.getItem('personal_vow') || '');
    const syncPractice = () => {
      setLocalPractice(practiceService.getDailyPractice());
      setLocalPracticeList(practiceService.getDailyPracticeList(scriptures));
    };
    const syncRitual = () =>
      setRitualPreDone(ritualService.getDailyState().completedPreRitual);

    fetchAllStats();
    window.addEventListener('storage', fetchAllStats);
    window.addEventListener('addExp', fetchAllStats);
    window.addEventListener('zen_data_updated', fetchAllStats);
    window.addEventListener('zen_thoughts_updated', fetchAllStats);
    window.addEventListener('zen_practice_settings_updated', syncPractice);
    window.addEventListener('zen_daily_practice_updated', syncPractice);
    window.addEventListener('zen_daily_ritual_updated', syncRitual);
    window.addEventListener('vow_updated', syncVow);
    window.addEventListener('focus', fetchAllStats);

    return () => {
      window.removeEventListener('storage', fetchAllStats);
      window.removeEventListener('addExp', fetchAllStats);
      window.removeEventListener('zen_data_updated', fetchAllStats);
      window.removeEventListener('zen_thoughts_updated', fetchAllStats);
      window.removeEventListener('zen_practice_settings_updated', syncPractice);
      window.removeEventListener('zen_daily_practice_updated', syncPractice);
      window.removeEventListener('zen_daily_ritual_updated', syncRitual);
      window.removeEventListener('vow_updated', syncVow);
      window.removeEventListener('focus', fetchAllStats);
    };
  }, []);

  useEffect(() => {
    safeStorage.setJSON('zen_workflow', {
      date: new Date().toDateString(),
      practiceDate: getPracticeDateKey(),
      state: workflowState,
    });
  }, [workflowState]);

  const toggleWorkflow = (key: keyof DailyPathWorkflowState) => {
    setWorkflowState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const scriptureTitles = useMemo(() => {
    const map: Record<string, string> = {};
    scriptures.forEach((s) => {
      map[s.id] = s.title;
    });
    return map;
  }, [scriptures]);

  const dailyPath = useMemo(() => {
    return getDailyPath(
      {
        practice: activePractice,
        dailyPracticeList: activePracticeList,
        scriptureTitles,
        ritualCompletedPreRitual: ritualPreDone,
        todayDeedsCount,
        todayThoughtsCount,
      },
      new Date(clockTick)
    );
  }, [
    activePractice,
    activePracticeList,
    scriptureTitles,
    ritualPreDone,
    todayDeedsCount,
    todayThoughtsCount,
    clockTick,
  ]);

  const handleDefaultNextAction = (next: DailyPathNextAction) => {
    if (onNextAction) {
      onNextAction(next);
      return;
    }
    if (next.target === 'thought-collector') {
      window.dispatchEvent(new CustomEvent('open-thought-collector'));
      return;
    }
    onNavigate?.(next.target);
  };

  // Calculate 7 days for the current week (Monday to Sunday)
  const weekDaysList = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    return labels.map((label, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateStr = d.toDateString();
      return {
        label,
        isToday: dateStr === now.toDateString(),
        hasPracticed: practicedDates.has(dateStr),
      };
    });
  }, [practicedDates]);

  const todayDateStr = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = yesterday.toDateString();
  const showWelcomeBack =
    !practicedDates.has(todayDateStr) && !practicedDates.has(yesterdayDateStr);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-xl mx-auto w-full px-0 sm:px-2 pt-0 sm:pt-1 space-y-4 sm:space-y-5 pb-28"
    >
      {/* 1. 晨雾禅语区（min-h-[18vh]，保留换一句/复制/分享） */}
      <section className="relative min-h-[18vh] flex flex-col items-center justify-center py-3 sm:py-5 -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 86% 14%, var(--theme-accent-mist) 0%, transparent 56%), radial-gradient(circle at 14% 86%, var(--theme-cloud-mist) 0%, transparent 56%)',
          }}
        />

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] rounded-full border border-line-strong opacity-60 pointer-events-none"
          style={{
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 68%, transparent 94%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 68%, transparent 94%)',
          }}
        />

        <DailyZenQuote variant="mist" />
      </section>

      {/* 2. 今日之路卡片 */}
      <DailyPathCard
        dailyPath={dailyPath}
        dailyPractice={activePractice}
        personalVow={effectiveVow}
        todayDeedsCount={todayDeedsCount}
        todayThoughtsCount={todayThoughtsCount}
        workflowState={workflowState}
        onToggleWorkflow={toggleWorkflow}
        onNextAction={handleDefaultNextAction}
        onNavigate={onNavigate}
      />

      {/* 3. 快捷文字链 */}
      <section className="flex flex-col items-center">
        <p className="text-caption flex items-center justify-center gap-1.5 flex-wrap">
          <span>或　</span>
          <button
            type="button"
            onClick={() => onNavigate?.('fish')}
            className="hover:text-accent transition-colors cursor-pointer py-1 px-1"
          >
            木鱼
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('meditation')}
            className="hover:text-accent transition-colors cursor-pointer py-1 px-1"
          >
            静坐
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('scripture')}
            className="hover:text-accent transition-colors cursor-pointer py-1 px-1"
          >
            读经
          </button>
        </p>
      </section>

      {/* 4. 七日足迹 */}
      <section className="flex flex-col items-center space-y-2.5 pt-1">
        {showWelcomeBack && (
          <p className="text-caption text-center">欢迎回来，从这一念开始。</p>
        )}

        <div className="w-full max-w-sm grid grid-cols-7 gap-2 items-center">
          {weekDaysList.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 select-none">
              <div
                className={cn(
                  'w-[10px] h-[10px] rounded-full transition-all',
                  !day.hasPracticed && 'border border-line-strong',
                  day.isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-paper'
                )}
                style={
                  day.hasPracticed
                    ? { background: 'var(--theme-gradient)' }
                    : undefined
                }
              />
              <span
                className={cn(
                  'text-caption',
                  day.isToday && 'text-accent font-medium'
                )}
              >
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};
