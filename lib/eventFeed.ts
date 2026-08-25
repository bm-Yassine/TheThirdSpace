import { dataService } from '../Backend/firebase';
import { mockEvents } from './events';
import { USE_MOCK_EVENTS } from './config';
import { byStartAscending, isUpcoming } from './eventTime';
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
  if (!USE_MOCK_EVENTS) return dbEvents.slice(0, maxItems);

  const dbIds = new Set(dbEvents.map((e) => String(e.id)));
  const mockOnly = mockEvents
    .filter((e) => !dbIds.has(String(e.id)))
    .map((event) => normalizeEvent(event));
  return [...dbEvents, ...mockOnly].slice(0, maxItems);
};

/**
 * The discovery feed only ever shows events you can still attend, soonest
 * first. Finished events stay reachable by id (profile history, ratings) but
 * are never scrolled past in Discover.
 */
const prepareFeed = (events: Event[], maxItems: number) =>
  events
    .filter((event) => (event as any).status !== 'cancelled')
    .filter((event) => isUpcoming(event))
    .sort(byStartAscending)
    .slice(0, maxItems);

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

  cachedEvents = [normalizedEvent, ...withoutCurrent].sort(byStartAscending).slice(0, maxItems);
  cachedAt = Date.now();
};

/**
 * The Firestore SDK retries a failed read indefinitely rather than rejecting,
 * so a project-level outage would otherwise leave every screen on a spinner
 * forever. Racing against a timeout turns that into a surfaceable error.
 */
const FETCH_TIMEOUT_MS = 12 * 1000;

class FeedTimeoutError extends Error {
  constructor() {
    super('Timed out while loading events');
    this.name = 'FeedTimeoutError';
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FeedTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/** Set when the last fetch failed, so screens can show a retry instead of an empty feed. */
let lastError: Error | null = null;

export const getEventFeedError = () => lastError;

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
    const fetchedEvents = (await withTimeout(
      dataService.getEvents({ limit }),
      FETCH_TIMEOUT_MS
    )) as Event[];
    const normalized = fetchedEvents.map(normalizeEvent);
    const combined = prepareFeed(mergeWithMockEvents(normalized, maxItems), maxItems);
    cachedEvents = combined;
    cachedAt = Date.now();
    lastError = null;
    return combined;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Could not load events');
    if (cachedEvents) return cachedEvents;

    // A failed fetch must not silently substitute seed data in production.
    const fallback = USE_MOCK_EVENTS
      ? prepareFeed(mockEvents.map((event) => normalizeEvent(event)), maxItems)
      : [];
    cachedEvents = fallback;
    cachedAt = Date.now();
    return fallback;
  }
}
