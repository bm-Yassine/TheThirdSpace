import { getEventStart } from './eventTime';
import type { Event } from './types';

/**
 * Feed filtering for the Cards view.
 *
 * Kept pure and separate from the screen so the matching rules can be tested
 * without rendering. The Discover view deliberately does not use this — its
 * ordering is reserved for the recommendation engine.
 */

export type PriceBand = 'any' | 'free' | 'under15' | 'under50';
export type DateBand = 'any' | 'today' | 'week' | 'month';

export type EventFilters = {
  query: string;
  types: string[];
  tags: string[];
  price: PriceBand;
  date: DateBand;
};

export const emptyFilters: EventFilters = {
  query: '',
  types: [],
  tags: [],
  price: 'any',
  date: 'any',
};

export const isFilterActive = (filters: EventFilters): boolean =>
  filters.query.trim() !== '' ||
  filters.types.length > 0 ||
  filters.tags.length > 0 ||
  filters.price !== 'any' ||
  filters.date !== 'any';

export const activeFilterCount = (filters: EventFilters): number =>
  (filters.query.trim() ? 1 : 0) +
  filters.types.length +
  filters.tags.length +
  (filters.price !== 'any' ? 1 : 0) +
  (filters.date !== 'any' ? 1 : 0);

/** Case- and accent-insensitive so "cafe" matches "Café". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const matchesQuery = (event: Event, query: string): boolean => {
  const needle = normalize(query.trim());
  if (!needle) return true;

  // Every whitespace-separated term must appear somewhere, so "yoga park"
  // narrows rather than widening the way an OR would.
  const haystack = normalize(
    [
      event.title,
      event.description,
      event.location,
      event.type,
      event.organizer?.name,
      ...(event.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
  );

  return needle.split(/\s+/).every((term) => haystack.includes(term));
};

const matchesPrice = (event: Event, band: PriceBand): boolean => {
  const cost = Number(event.cost || 0);
  switch (band) {
    case 'free':
      return cost === 0;
    case 'under15':
      return cost <= 15;
    case 'under50':
      return cost <= 50;
    default:
      return true;
  }
};

const matchesDate = (event: Event, band: DateBand, now: Date): boolean => {
  if (band === 'any') return true;

  const start = getEventStart(event);
  // An undated event is never excluded by a date filter — better to show it
  // than to hide it on a technicality.
  if (!start) return true;

  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const horizon = new Date(endOfToday);
  if (band === 'week') horizon.setDate(horizon.getDate() + 7);
  if (band === 'month') horizon.setMonth(horizon.getMonth() + 1);

  return start.getTime() <= horizon.getTime();
};

export const applyFilters = (
  events: Event[],
  filters: EventFilters,
  now: Date = new Date()
): Event[] =>
  events.filter(
    (event) =>
      matchesQuery(event, filters.query) &&
      (filters.types.length === 0 || filters.types.includes(event.type || '')) &&
      // Tags are OR'd: picking Music and Sports means "either", which is what
      // people expect from a tag chip row.
      (filters.tags.length === 0 ||
        (event.tags || []).some((tag) => filters.tags.includes(tag))) &&
      matchesPrice(event, filters.price) &&
      matchesDate(event, filters.date, now)
  );

/** The tags actually present in the feed, most common first. */
export const collectTags = (events: Event[], limit = 20): string[] => {
  const counts = new Map<string, number>();
  events.forEach((event) =>
    (event.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  );
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
};

export const collectTypes = (events: Event[]): string[] =>
  [...new Set(events.map((event) => event.type).filter(Boolean) as string[])].sort();
