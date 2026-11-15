import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Repeat,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Scripture } from '../constants';
import { DailyPracticeItem } from '../types/practice';
import { isMeditationPracticeItem } from '../services/practiceService';
import {
  CalendarAuthError,
  CalendarEventDraft,
  GoogleCalendarEvent,
  GoogleCalendarListEntry,
  clearCalendarAccessToken,
  connectGoogleCalendar,
  createCalendarEvent,
  createPracticeCalendar,
  deleteCalendarEvent,
  getAccessToken,
  initGoogleCalendarAuth,
  listCalendars,
  listUpcomingEvents,
  updateCalendarEvent,
} from '../services/googleCalendarService';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface GoogleCalendarViewProps {
  dailyPractice: DailyPracticeItem[];
  allScriptures: Scripture[];
  personalVow?: string;
}

type PendingMutation =
  | {
      type: 'create_event';
      calendarId: string;
      calendarName: string;
      draft: CalendarEventDraft;
    }
  | {
      type: 'update_event';
      calendarId: string;
      calendarName: string;
      eventId: string;
      originalSummary: string;
      draft: CalendarEventDraft;
    }
  | {
      type: 'delete_event';
      calendarId: string;
      calendarName: string;
      event: GoogleCalendarEvent;
    }
  | {
      type: 'create_calendar';
      summary: string;
    };

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatEventTimeRange(event: GoogleCalendarEvent): string {
  if (event.start.date && !event.start.dateTime) {
    return `${event.start.date} · 全天`;
  }
  if (!event.start.dateTime) return '时间未定';
  const start = new Date(event.start.dateTime);
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
  const dateLabel = start.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const startTime = start.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = end
    ? end.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';
  return endTime ? `${dateLabel} · ${startTime} - ${endTime}` : `${dateLabel} · ${startTime}`;
}

function eventToDraft(event: GoogleCalendarEvent): CalendarEventDraft {
  if (event.start.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(start.getTime() + 30 * 60 * 1000);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const sh = String(start.getHours()).padStart(2, '0');
    const sm = String(start.getMinutes()).padStart(2, '0');
    const eh = String(end.getHours()).padStart(2, '0');
    const em = String(end.getMinutes()).padStart(2, '0');
    return {
      summary: event.summary || '',
      description: event.description || '',
      date: `${y}-${m}-${day}`,
      startTime: `${sh}:${sm}`,
      endTime: `${eh}:${em}`,
      recurrenceRule: 'none',
      reminderMinutes: 10,
    };
  }
  return {
    summary: event.summary || '',
    description: event.description || '',
    date: event.start.date || getTodayDateString(),
    startTime: '07:00',
    endTime: '07:30',
    recurrenceRule: 'none',
    reminderMinutes: 10,
  };
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({
  dailyPractice,
  allScriptures,
  personalVow,
}) => {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectedEmail, setConnectedEmail] = useState<string>('');

  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [draft, setDraft] = useState<CalendarEventDraft>({
    summary: '',
    description: '',
    date: getTodayDateString(),
    startTime: '07:00',
    endTime: '07:30',
    recurrenceRule: 'daily',
    reminderMinutes: 10,
  });

  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [isExecutingMutation, setIsExecutingMutation] = useState<boolean>(false);

  const selectedCalendar = useMemo(
    () => calendars.find((c) => c.id === selectedCalendarId) || calendars[0],
    [calendars, selectedCalendarId]
  );

  const selectedCalendarName = selectedCalendar?.summary || '主日历 (Primary)';
  const canWriteSelectedCalendar =
    !selectedCalendar?.accessRole ||
    selectedCalendar.accessRole === 'owner' ||
    selectedCalendar.accessRole === 'writer';

  const dailyPracticeSummaryText = useMemo(() => {
    const enabled = dailyPractice
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order);
    if (enabled.length === 0) return '自由念诵与静坐调息';
    return enabled
      .map((item) => {
        if (isMeditationPracticeItem(item)) {
          return `静坐 ${item.minutes || item.target || 15} 分钟`;
        }
        const sc = allScriptures.find((s) => s.id === item.scriptureId);
        const title = sc?.title || item.scriptureId;
        return `${title} ${item.target} ${item.unit || '声'}`;
      })
      .join('、');
  }, [dailyPractice, allScriptures]);

  const loadCalendarData = useCallback(async (targetCalId?: string) => {
    setIsLoadingEvents(true);
    try {
      const calList = await listCalendars();
      setCalendars(calList);
      const effectiveId =
        targetCalId ||
        (calList.some((c) => c.id === selectedCalendarId)
          ? selectedCalendarId
          : calList[0]?.id || 'primary');
      setSelectedCalendarId(effectiveId);

      const evs = await listUpcomingEvents(effectiveId, 14);
      setEvents(evs);
      setNeedsAuth(false);
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        setNeedsAuth(true);
        toast.info(err.message);
      } else {
        console.error('Load Google Calendar error:', err);
        toast.error(err?.message || '读取 Google 日历失败，请稍后重试');
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedCalendarId]);

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (user) => {
        setConnectedEmail(user.email || user.displayName || '');
        setNeedsAuth(false);
        loadCalendarData();
      },
      () => {
        setNeedsAuth(true);
        setEvents([]);
      }
    );

    // Check if an in-memory token already exists from earlier in this session
    getAccessToken().then((token) => {
      if (token && auth.currentUser) {
        setConnectedEmail(auth.currentUser.email || auth.currentUser.displayName || '');
        setNeedsAuth(false);
        loadCalendarData();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const result = await connectGoogleCalendar();
      setConnectedEmail(result.user.email || result.user.displayName || '');
      setNeedsAuth(false);
      toast.success('已连接 Google 日历');
      await loadCalendarData('primary');
    } catch (err: any) {
      console.error('Google Calendar auth error:', err);
      toast.error(err?.message || '连接 Google 日历失败，请允许弹窗后重试');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = () => {
    clearCalendarAccessToken();
    setNeedsAuth(true);
    setCalendars([]);
    setEvents([]);
    toast.success('已断开当前会话的 Google 日历授权');
  };

  const handleCalendarSwitch = async (calId: string) => {
    setSelectedCalendarId(calId);
    await loadCalendarData(calId);
  };

  const openPresetDraft = (preset: {
    summary: string;
    startTime: string;
    endTime: string;
    description: string;
    recurrenceRule: 'daily' | 'weekly' | 'none';
  }) => {
    setEditingEvent(null);
    setDraft({
      summary: preset.summary,
      description: preset.description,
      date: getTodayDateString(),
      startTime: preset.startTime,
      endTime: preset.endTime,
      recurrenceRule: preset.recurrenceRule,
      reminderMinutes: 10,
    });
    setShowEditorModal(true);
  };

  const openEditModal = (event: GoogleCalendarEvent) => {
    setEditingEvent(event);
    setDraft(eventToDraft(event));
    setShowEditorModal(true);
  };

  const handleRequestSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.summary.trim()) {
      toast.error('请填写日程标题');
      return;
    }
    if (!canWriteSelectedCalendar) {
      toast.error('当前日历为只读权限，请切换到您可编辑的日历或新建修行日历');
      return;
    }

    if (editingEvent) {
      setPendingMutation({
        type: 'update_event',
        calendarId: selectedCalendarId,
        calendarName: selectedCalendarName,
        eventId: editingEvent.id,
        originalSummary: editingEvent.summary || '未命名日程',
        draft: { ...draft },
      });
    } else {
      setPendingMutation({
        type: 'create_event',
        calendarId: selectedCalendarId,
        calendarName: selectedCalendarName,
        draft: { ...draft },
      });
    }
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;
    setIsExecutingMutation(true);
    try {
      if (pendingMutation.type === 'create_event') {
        await createCalendarEvent(pendingMutation.calendarId, pendingMutation.draft);
        toast.success('已添加日程到 Google 日历');
        setShowEditorModal(false);
        await loadCalendarData(pendingMutation.calendarId);
      } else if (pendingMutation.type === 'update_event') {
        await updateCalendarEvent(
          pendingMutation.calendarId,
          pendingMutation.eventId,
          pendingMutation.draft
        );
        toast.success('已更新 Google 日历日程');
        setShowEditorModal(false);
        setEditingEvent(null);
        await loadCalendarData(pendingMutation.calendarId);
      } else if (pendingMutation.type === 'delete_event') {
        await deleteCalendarEvent(pendingMutation.calendarId, pendingMutation.event.id);
        toast.success('已从 Google 日历删除该日程');
        await loadCalendarData(pendingMutation.calendarId);
      } else if (pendingMutation.type === 'create_calendar') {
        const created = await createPracticeCalendar(pendingMutation.summary);
        toast.success(`已创建日历「${created.summary}」`);
        await loadCalendarData(created.id);
      }
      setPendingMutation(null);
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        setPendingMutation(null);
        setNeedsAuth(true);
        toast.error(err.message);
      } else {
        console.error('Calendar mutation error:', err);
        toast.error(err?.message || '操作 Google 日历失败，请重试');
      }
    } finally {
      setIsExecutingMutation(false);
    }
  };

  const quickPresets = useMemo(
    () => [
      {
        id: 'morning',
        label: '晨课发愿 · 今日定课',
        timeLabel: '每天 07:00',
        summary: '愿禅助手 · 晨课发愿与定课',
        startTime: '07:00',
        endTime: '07:30',
        recurrenceRule: 'daily' as const,
        description: `今日定课：${dailyPracticeSummaryText}${
          personalVow?.trim() ? `\n长期发愿：${personalVow.trim()}` : ''
        }`,
      },
      {
        id: 'midday',
        label: '午间一念 · 静心觉察',
        timeLabel: '每天 12:30',
        summary: '愿禅助手 · 午间一念觉察',
        startTime: '12:30',
        endTime: '12:40',
        recurrenceRule: 'daily' as const,
        description: '停下来深呼吸三次，在愿禅助手记下一念或今日一善。',
      },
      {
        id: 'evening',
        label: '晚课回向与复盘',
        timeLabel: '每天 21:00',
        summary: '愿禅助手 · 晚课回向与复盘',
        startTime: '21:00',
        endTime: '21:20',
        recurrenceRule: 'daily' as const,
        description: '回看今日修行，观照起心动念，普皆回向并为明日发下一愿。',
      },
    ],
    [dailyPracticeSummaryText, personalVow]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="max-w-2xl mx-auto w-full space-y-6 pb-24"
    >
      {/* Header Card */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-serif font-bold text-ink flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-accent" />
              <span>修行日历（Google Calendar）</span>
            </h2>
            <p className="text-sm text-ink-2">
              连接你的 Google 日历，查看近期日程并将晨课、午间一念与晚课回向安排为每日提醒。
            </p>
          </div>
        </div>

        {needsAuth ? (
          <div className="pt-2 space-y-5">
            <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2 text-sm text-ink-2">
              <p className="font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>授权后你可以：</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                <li>查看未来 14 天的 Google 日历安排，避开忙碌时段安排静坐与诵经</li>
                <li>一键将「晨课定课 / 午间一念 / 晚课复盘」创建为 Google 日历每日提醒</li>
                <li>新增、修改或删除日程前都会先弹出明确确认框，绝不静默改动你的日历</li>
              </ul>
            </div>

            {/* Official Google Sign-In Button Styling */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-full bg-white text-[#1f1f1f] border border-[#747775] hover:bg-[#f8f9fa] active:bg-[#e8eaed] shadow-sm transition-colors font-medium text-sm disabled:opacity-60 cursor-pointer"
              >
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#4285F4]" />
                ) : (
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5 shrink-0 block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span>{isConnecting ? '正在授权连接...' : 'Sign in with Google'}</span>
              </button>
              <p className="text-xs text-ink-3">
                授权令牌仅保存在当前页面内存中，退出或刷新后会安全清除。
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-2 border border-line">
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-bold text-accent">已连接 Google 日历</p>
                {connectedEmail && (
                  <p className="text-ink-2 truncate">{connectedEmail}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadCalendarData(selectedCalendarId)}
                  disabled={isLoadingEvents}
                  className="px-3 py-1.5 rounded-full bg-surface border border-line hover:border-line-strong text-xs font-medium text-ink flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isLoadingEvents && 'animate-spin')} />
                  <span>刷新</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectCalendar}
                  className="px-3 py-1.5 rounded-full bg-surface border border-line hover:border-red-500/40 text-xs font-medium text-ink-2 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>断开</span>
                </button>
              </div>
            </div>

            {/* Calendar Selector + Dedicated Calendar Creation */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                value={selectedCalendarId}
                onChange={(e) => handleCalendarSwitch(e.target.value)}
                className="flex-1 bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
              >
                {calendars.length === 0 ? (
                  <option value="primary">主日历 (Primary)</option>
                ) : (
                  calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                      {cal.primary ? '（主日历）' : ''}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={() =>
                  setPendingMutation({
                    type: 'create_calendar',
                    summary: '愿禅助手 · 修行日程',
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-line hover:border-accent/40 text-xs font-bold text-ink hover:text-accent transition-colors shrink-0"
              >
                ＋ 新建修行专用日历
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connected Features */}
      {!needsAuth && (
        <>
          {/* Quick Daily Practice Scheduler */}
          <div className="bg-surface rounded-3xl p-6 border border-line space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">一键排入每日修行</h3>
                <p className="text-xs text-ink-2 mt-0.5">
                  点击下方卡片可预览并确认添加到「{selectedCalendarName}」
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openPresetDraft({
                    summary: '愿禅助手 · 禅修静坐',
                    startTime: '19:30',
                    endTime: '20:00',
                    recurrenceRule: 'none',
                    description: '留出 30 分钟静坐调息，安住当下。',
                  })
                }
                className="px-3.5 py-2 rounded-full bg-accent text-on-accent hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>新建日程</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => openPresetDraft(preset)}
                  className="p-4 rounded-2xl bg-surface-2 border border-line hover:border-accent/50 text-left transition-colors space-y-1.5"
                >
                  <p className="text-sm font-bold text-ink">{preset.label}</p>
                  <p className="text-xs text-accent flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{preset.timeLabel}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-surface rounded-3xl p-6 border border-line space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">未来 14 天日程</h3>
              <span className="text-xs text-ink-3">{events.length} 项安排</span>
            </div>

            {isLoadingEvents ? (
              <div className="py-12 flex flex-col items-center gap-2 text-ink-3">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span className="text-xs">正在读取 Google 日历...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-10 text-center space-y-2 bg-surface-2 rounded-2xl border border-line">
                <Calendar className="w-8 h-8 text-ink-3 mx-auto opacity-60" />
                <p className="text-sm text-ink-2">未来 14 天暂无日程</p>
                <p className="text-xs text-ink-3">
                  可点击上方预设卡片，把每日定课与晚课提醒写入日历
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-surface-2 border border-line flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-bold text-sm text-ink break-words">
                        {ev.summary || '（无标题日程）'}
                      </p>
                      <p className="text-xs text-accent flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatEventTimeRange(ev)}</span>
                      </p>
                      {ev.description && (
                        <p className="text-xs text-ink-2 line-clamp-2 whitespace-pre-wrap pt-0.5">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    {canWriteSelectedCalendar && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          aria-label="编辑日程"
                          className="p-2 rounded-full text-ink-3 hover:text-accent hover:bg-surface transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingMutation({
                              type: 'delete_event',
                              calendarId: selectedCalendarId,
                              calendarName: selectedCalendarName,
                              event: ev,
                            })
                          }
                          aria-label="删除日程"
                          className="p-2 rounded-full text-ink-3 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Event Draft Editor Modal */}
      <AnimatePresence>
        {showEditorModal && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-surface rounded-3xl w-full max-w-md border border-line shadow-float overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <h4 className="font-bold text-lg text-ink">
                  {editingEvent ? '修改日历日程' : '新建日历日程'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditorModal(false);
                    setEditingEvent(null);
                  }}
                  className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestSaveDraft} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1.5">
                    日程标题
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                    placeholder="例如：愿禅助手 · 每日早课"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-xs font-bold text-ink-2 mb-1.5">
                      日期
                    </label>
                    <input
                      type="date"
                      required
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1.5">
                      开始时间
                    </label>
                    <input
                      type="time"
                      required
                      value={draft.startTime}
                      onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1.5">
                      结束时间
                    </label>
                    <input
                      type="time"
                      required
                      value={draft.endTime}
                      onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1.5">
                    重复频率
                  </label>
                  <select
                    value={draft.recurrenceRule || 'none'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        recurrenceRule: e.target.value as 'none' | 'daily' | 'weekly',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="none">仅此一次（不重复）</option>
                    <option value="daily">每天重复</option>
                    <option value="weekly">每周重复</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1.5">
                    备注内容（选填）
                  </label>
                  <textarea
                    rows={3}
                    value={draft.description || ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="可记录定课经文、回向或修行提醒"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditorModal(false);
                      setEditingEvent(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-surface-2 text-ink-2 font-bold text-sm hover:text-ink"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-accent text-on-accent font-bold text-sm hover:bg-accent-hover"
                  >
                    下一步：确认写入
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory Explicit Confirmation Modal before ANY Calendar Mutation */}
      <AnimatePresence>
        {pendingMutation && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-surface rounded-3xl w-full max-w-md border border-line shadow-float p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    pendingMutation.type === 'delete_event'
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-accent-mist text-accent'
                  )}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-ink">
                    {pendingMutation.type === 'create_event' && '确认添加日程到 Google 日历？'}
                    {pendingMutation.type === 'update_event' && '确认修改 Google 日历日程？'}
                    {pendingMutation.type === 'delete_event' && '确认永久删除该日历日程？'}
                    {pendingMutation.type === 'create_calendar' && '确认新建 Google 日历？'}
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {pendingMutation.type === 'create_event' &&
                      `将在「${pendingMutation.calendarName}」创建新日程：`}
                    {pendingMutation.type === 'update_event' &&
                      `将修改「${pendingMutation.calendarName}」中的原有日程「${pendingMutation.originalSummary}」：`}
                    {pendingMutation.type === 'delete_event' &&
                      `此操作将从「${pendingMutation.calendarName}」中删除该日程，删除后无法撤销：`}
                    {pendingMutation.type === 'create_calendar' &&
                      `将在你的 Google 账号中创建一个名为「${pendingMutation.summary}」的专属修行日历。`}
                  </p>
                </div>
              </div>

              {(pendingMutation.type === 'create_event' ||
                pendingMutation.type === 'update_event') && (
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-line text-xs space-y-1 text-ink-2">
                  <p className="font-bold text-ink">{pendingMutation.draft.summary}</p>
                  <p>
                    时间：{pendingMutation.draft.date} {pendingMutation.draft.startTime} -{' '}
                    {pendingMutation.draft.endTime}
                    {pendingMutation.draft.recurrenceRule === 'daily'
                      ? '（每天重复）'
                      : pendingMutation.draft.recurrenceRule === 'weekly'
                      ? '（每周重复）'
                      : ''}
                  </p>
                  {pendingMutation.draft.description && (
                    <p className="line-clamp-3 whitespace-pre-wrap">
                      备注：{pendingMutation.draft.description}
                    </p>
                  )}
                </div>
              )}

              {pendingMutation.type === 'delete_event' && (
                <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs space-y-1 text-ink-2">
                  <p className="font-bold text-red-500">
                    {pendingMutation.event.summary || '（无标题日程）'}
                  </p>
                  <p>{formatEventTimeRange(pendingMutation.event)}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isExecutingMutation}
                  onClick={() => setPendingMutation(null)}
                  className="flex-1 py-3 rounded-xl bg-surface-2 text-ink-2 font-bold text-sm hover:text-ink disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isExecutingMutation}
                  onClick={handleConfirmMutation}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60',
                    pendingMutation.type === 'delete_event'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-accent text-on-accent hover:bg-accent-hover'
                  )}
                >
                  {isExecutingMutation && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {pendingMutation.type === 'delete_event' ? '确认删除' : '确认写入'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
