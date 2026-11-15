import {
  GoogleAuthProvider,
  User,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  'https://www.googleapis.com/auth/calendar.events.public.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
] as const;

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export class CalendarAuthError extends Error {
  constructor(message = '需要授权连接 Google 日历') {
    super(message);
    this.name = 'CalendarAuthError';
  }
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  backgroundColor?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  recurrence?: string[];
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export interface CalendarEventDraft {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  recurrenceRule?: 'none' | 'daily' | 'weekly';
  reminderMinutes?: number;
}

function buildCalendarProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  GOOGLE_CALENDAR_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });
  provider.setCustomParameters({
    prompt: 'consent select_account',
  });
  return provider;
}

export const initGoogleCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearCalendarAccessToken = (): void => {
  cachedAccessToken = null;
};

export const connectGoogleCalendar = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  const provider = buildCalendarProvider();
  try {
    isSigningIn = true;
    const currentUser = auth.currentUser;
    let result;

    if (currentUser) {
      const hasGoogleProvider = currentUser.providerData.some(
        (p) => p.providerId === 'google.com'
      );
      if (hasGoogleProvider) {
        try {
          result = await reauthenticateWithPopup(currentUser, provider);
        } catch (reauthErr: any) {
          if (reauthErr?.code === 'auth/user-mismatch') {
            result = await signInWithPopup(auth, provider);
          } else {
            throw reauthErr;
          }
        }
      } else {
        try {
          result = await linkWithPopup(currentUser, provider);
        } catch (linkErr: any) {
          if (
            linkErr?.code === 'auth/credential-already-in-use' ||
            linkErr?.code === 'auth/provider-already-linked'
          ) {
            result = await signInWithPopup(auth, provider);
          } else {
            throw linkErr;
          }
        }
      }
    } else {
      result = await signInWithPopup(auth, provider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('未能获取 Google 日历访问令牌，请在弹窗中允许日历权限后重试。');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

async function calendarFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new CalendarAuthError('请先使用 Google 账号授权日历访问');
  }

  const res = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new CalendarAuthError('Google 日历授权已过期或权限不足，请重新连接。');
  }

  if (!res.ok) {
    let message = `Google 日历请求失败 (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        message = errBody.error.message;
      }
    } catch {
      // ignore non-json error response
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function listCalendars(): Promise<GoogleCalendarListEntry[]> {
  const data = await calendarFetch<{ items?: GoogleCalendarListEntry[] }>(
    '/users/me/calendarList?minAccessRole=reader'
  );
  const items = Array.isArray(data.items) ? data.items : [];
  return items.sort((a, b) => (a.primary ? -1 : b.primary ? 1 : 0));
}

export async function listUpcomingEvents(
  calendarId = 'primary',
  daysAhead = 14
): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const timeMinDate = new Date(now);
  timeMinDate.setHours(0, 0, 0, 0);

  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + daysAhead);
  timeMaxDate.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
    timeMin: timeMinDate.toISOString(),
    timeMax: timeMaxDate.toISOString(),
  });

  const encodedId = encodeURIComponent(calendarId);
  const data = await calendarFetch<{ items?: GoogleCalendarEvent[] }>(
    `/calendars/${encodedId}/events?${params.toString()}`
  );
  return Array.isArray(data.items) ? data.items : [];
}

function buildEventResource(draft: CalendarEventDraft) {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const startLocal = new Date(`${draft.date}T${draft.startTime}:00`);
  let endLocal = new Date(`${draft.date}T${draft.endTime}:00`);
  if (endLocal <= startLocal) {
    endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000);
  }

  const recurrence =
    draft.recurrenceRule === 'daily'
      ? ['RRULE:FREQ=DAILY']
      : draft.recurrenceRule === 'weekly'
      ? ['RRULE:FREQ=WEEKLY']
      : undefined;

  return {
    summary: draft.summary.trim(),
    description: draft.description?.trim() || undefined,
    start: {
      dateTime: startLocal.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endLocal.toISOString(),
      timeZone,
    },
    ...(recurrence ? { recurrence } : {}),
    ...(typeof draft.reminderMinutes === 'number'
      ? {
          reminders: {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: draft.reminderMinutes }],
          },
        }
      : {}),
  };
}

export async function createCalendarEvent(
  calendarId: string,
  draft: CalendarEventDraft
): Promise<GoogleCalendarEvent> {
  const encodedId = encodeURIComponent(calendarId);
  const body = buildEventResource(draft);
  return calendarFetch<GoogleCalendarEvent>(`/calendars/${encodedId}/events`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  draft: CalendarEventDraft
): Promise<GoogleCalendarEvent> {
  const encodedCalId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);
  const body = buildEventResource(draft);
  return calendarFetch<GoogleCalendarEvent>(
    `/calendars/${encodedCalId}/events/${encodedEventId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}

export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const encodedCalId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);
  await calendarFetch<void>(
    `/calendars/${encodedCalId}/events/${encodedEventId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function createPracticeCalendar(
  summary = '愿禅助手 · 修行日程'
): Promise<GoogleCalendarListEntry> {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  return calendarFetch<GoogleCalendarListEntry>('/calendars', {
    method: 'POST',
    body: JSON.stringify({
      summary: summary.trim(),
      description: '由愿禅助手 (Vowzen) 同步的每日定课、静坐与修行提醒日程',
      timeZone,
    }),
  });
}
