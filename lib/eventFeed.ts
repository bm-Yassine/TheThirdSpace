import { dataService } from '../Backend/firebase';
import { mockEvents } from './events';
import type { Event } from './types';

const CACHE_TTL_MS = 2 * 60 * 1000;

let cachedEvents: Event[] | null = null;
let cachedAt = 0;

const toOrganizerUid = (name?: string | null) => {
  const normalized = (name || 'organizer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `mock-organizer-${normalized || 'user'}`;
};

const normalizeEvent = (event: any): Event => ({
  ...event,
  organizer: {
    uid: event.organizer?.uid || event.createdBy || toOrganizerUid(event.organizer?.name),
    name: event.organizer?.name || 'Unknown Organizer',
    avatar: event.organizer?.avatar || '👤',
    photoURL: event.organizer?.photoURL || null,
  },
  imageUrl:
    event.imageUrl ||
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&h=800&fit=crop',
});

const mergeWithMockEvents = (dbEvents: Event[], maxItems: number) => {
  const dbIds = new Set(dbEvents.map((e) => String(e.id)));
  const mockOnly = mockEvents
    .filter((e) => !dbIds.has(String(e.id)))
    .map((event) => normalizeEvent(event));
  return [...dbEvents, ...mockOnly].slice(0, maxItems);
};

export const getCachedEventFeed = () => cachedEvents;

export const invalidateEventFeedCache = () => {
  cachedEvents = null;
  cachedAt = 0;
};

export const upsertCachedEvent = (event: Event, options?: { maxItems?: number }) => {
  const maxItems = options?.maxItems ?? 30;
  const normalizedEvent = normalizeEvent(event);
  const existing = cachedEvents || [];
  const withoutCurrent = existing.filter(
    (item) => String(item.id) !== String(normalizedEvent.id)
  );

  cachedEvents = [normalizedEvent, ...withoutCurrent].slice(0, maxItems);
  cachedAt = Date.now();
};

export async function preloadEventFeed(
  options?: { force?: boolean; limit?: number; maxItems?: number }
): Promise<Event[]> {
  const force = options?.force ?? false;
  const limit = options?.limit ?? 30;
  const maxItems = options?.maxItems ?? 30;

  const isFresh = cachedEvents && Date.now() - cachedAt < CACHE_TTL_MS;
  if (!force && isFresh && cachedEvents) {
    return cachedEvents;
  }

  try {
    const fetchedEvents = (await dataService.getEvents({ limit })) as Event[];
    const normalized = fetchedEvents.map(normalizeEvent);
    const combined = mergeWithMockEvents(normalized, maxItems);
    cachedEvents = combined;
    cachedAt = Date.now();
    return combined;
  } catch (error) {
    if (cachedEvents) return cachedEvents;
    const fallback = mockEvents.slice(0, maxItems).map((event) => normalizeEvent(event));
    cachedEvents = fallback;
    cachedAt = Date.now();
    return fallback;
  }
}
