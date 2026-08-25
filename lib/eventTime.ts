/**
 * Event scheduling helpers.
 *
 * Events created before the date picker existed only carried free-text
 * `date` / `time` strings (and `date` was always stamped as "today"). Events
 * created now carry a real `startsAt` ISO timestamp plus `durationMinutes`.
 * Everything here reads the new fields first and degrades to the legacy
 * strings so old documents still sort and render.
 */

export const DEFAULT_EVENT_DURATION_MINUTES = 120;

/** Normalises Date | Firestore Timestamp | ISO string | epoch ms to a Date. */
export const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value);

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toMillis = (value: any): number => toDate(value)?.getTime() ?? 0;

/**
 * Combines a `YYYY-MM-DD` date and an `HH:mm` time into a local Date.
 * Built explicitly rather than via `new Date(string)` so the result is local
 * time on every platform — Safari and Chrome disagree on bare ISO date strings.
 */
export const combineDateAndTime = (dateISO: string, timeHHmm: string): Date | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  if (!dateMatch) return null;

  const [, year, month, day] = dateMatch;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec((timeHHmm || '').trim());
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;

  if (hours > 23 || minutes > 59) return null;

  const result = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

/** Best-effort start time for an event, new schema first then legacy strings. */
export const getEventStart = (event: any): Date | null => {
  if (!event) return null;

  const fromStartsAt = toDate(event.startsAt);
  if (fromStartsAt) return fromStartsAt;

  // Legacy documents: free-text `date` plus free-text `time`.
  const rawDate = typeof event.date === 'string' ? event.date.trim() : '';
  if (!rawDate) return null;

  const rawTime = typeof event.time === 'string' ? event.time.trim() : '';
  const normalizedTime = normalizeLegacyTime(rawTime);

  const isoAttempt = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? combineDateAndTime(rawDate, normalizedTime || '00:00')
    : null;
  if (isoAttempt) return isoAttempt;

  const looseAttempt = toDate(normalizedTime ? `${rawDate} ${normalizedTime}` : rawDate);
  return looseAttempt ?? toDate(rawDate);
};

/** Turns "7:30 PM", "19:30", "7 PM" into "HH:mm"; returns '' when unparseable. */
const normalizeLegacyTime = (raw: string): string => {
  if (!raw) return '';

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(raw);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const getEventEnd = (event: any): Date | null => {
  const explicitEnd = toDate(event?.endsAt);
  if (explicitEnd) return explicitEnd;

  const start = getEventStart(event);
  if (!start) return null;

  const minutes = Number(event?.durationMinutes) || DEFAULT_EVENT_DURATION_MINUTES;
  return new Date(start.getTime() + minutes * 60 * 1000);
};

/** An event is "past" once its end time has elapsed — this gates rating. */
export const hasEventEnded = (event: any, now: Date = new Date()): boolean => {
  const end = getEventEnd(event);
  if (!end) return false;
  return end.getTime() <= now.getTime();
};

export const isUpcoming = (event: any, now: Date = new Date()): boolean => {
  const end = getEventEnd(event);
  // Events with no parseable date are treated as upcoming so they stay visible
  // rather than silently vanishing into history.
  if (!end) return true;
  return end.getTime() > now.getTime();
};

export const formatEventDate = (event: any): string => {
  const start = getEventStart(event);
  if (!start) return typeof event?.date === 'string' && event.date ? event.date : 'Date TBD';
  return start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
};

export const formatEventTime = (event: any): string => {
  if (event?.timeFlexible) return 'Flexible';
  const start = getEventStart(event);
  if (!start) return typeof event?.time === 'string' && event.time ? event.time : 'Time TBD';
  return start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export const formatEventDateTime = (event: any): string =>
  `${formatEventDate(event)} • ${formatEventTime(event)}`;

/** "in 3 days" / "2 weeks ago" for history and upcoming lists. */
export const formatRelativeToNow = (event: any, now: Date = new Date()): string => {
  const start = getEventStart(event);
  if (!start) return '';

  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks > 0 && diffWeeks < 5) return `In ${diffWeeks} week${diffWeeks === 1 ? '' : 's'}`;
  if (diffWeeks < 0 && diffWeeks > -5) {
    const weeks = Math.abs(diffWeeks);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  return formatEventDate(event);
};

/** Sort helper: soonest upcoming first. */
export const byStartAscending = (a: any, b: any) =>
  (getEventStart(a)?.getTime() ?? Infinity) - (getEventStart(b)?.getTime() ?? Infinity);

/** Sort helper: most recently finished first. */
export const byStartDescending = (a: any, b: any) =>
  (getEventStart(b)?.getTime() ?? -Infinity) - (getEventStart(a)?.getTime() ?? -Infinity);
