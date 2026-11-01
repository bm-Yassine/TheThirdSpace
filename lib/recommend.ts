import { getEventStart } from './eventTime';
import { distanceToEvent, type Coords } from './geo';
import type { Event } from './types';

/**
 * Ranking for the Discover feed.
 *
 * Deliberately a transparent weighted scorer rather than a learned model. With
 * few users and few events there is nothing for a model to learn from, and the
 * cold-start case *is* the product right now. A hand-built scorer also gives a
 * reason string per event, which a black box cannot — and being able to say
 * "because you like live music, 800 m away" is worth more than a marginally
 * better ordering.
 *
 * The weights below are a starting hypothesis, not a result. `lib/signals.ts`
 * records what people actually do so they can eventually be fitted rather than
 * guessed.
 */

export type RecommendContext = {
  interests: string[];
  coords: Coords | null;
  now: Date;
  /** Tags from events the user has already joined — revealed preference. */
  affinityTags?: string[];
  /** What they have actually paid before, for judging price fit. */
  typicalSpend?: number;
  /** Event ids already seen, so the feed does not repeat itself. */
  seenEventIds?: Set<string>;
  /** Optional, and only meaningful for outdoor events in the next few days. */
  weather?: { condition: 'good' | 'poor'; withinDays: number } | null;
};

/** The per-signal values behind a score, each 0..1. */
export type FeatureVector = {
  interest: number;
  proximity: number;
  timing: number;
  socialProof: number;
  reputation: number;
  priceFit: number;
  novelty: number;
};

export const FEATURE_KEYS: (keyof FeatureVector)[] = [
  'interest',
  'proximity',
  'timing',
  'socialProof',
  'reputation',
  'priceFit',
  'novelty',
];

export type ScoredEvent = {
  event: Event;
  score: number;
  /** Human-readable, in the order they contributed most. */
  reasons: string[];
  /**
   * The raw signal values. Logged with each impression so the weights can
   * eventually be fitted against real outcomes — a single composite score
   * carries no information about which signal earned it, so without this the
   * weights could never be anything but guesses.
   */
  features: FeatureVector;
};

/**
 * Each signal returns 0..1; weights are relative, not probabilities.
 *
 * These are a starting hypothesis. `scripts/fit-weights.mjs` fits them
 * against logged outcomes once enough signals exist, and `setWeights` lets a
 * fitted set be applied without shipping a release.
 */
export const DEFAULT_WEIGHTS: FeatureVector = {
  interest: 3.0,
  proximity: 2.2,
  timing: 1.6,
  socialProof: 1.2,
  reputation: 0.9,
  priceFit: 0.7,
  novelty: 0.6,
};

let WEIGHTS: FeatureVector = { ...DEFAULT_WEIGHTS };

/** Applies a fitted set. Partial overrides keep the defaults for the rest. */
export const setWeights = (next: Partial<FeatureVector>) => {
  WEIGHTS = { ...DEFAULT_WEIGHTS, ...next };
};

export const getWeights = (): FeatureVector => ({ ...WEIGHTS });

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const normalise = (value: string) => value.trim().toLowerCase();

/**
 * Overlap between what someone says they like and what the event is about.
 * Divided by the smaller set so a heavily tagged event does not dominate
 * simply by listing more tags.
 */
export const interestScore = (event: Event, interests: string[], affinity: string[] = []) => {
  // Keep the original casing: the matched tag is shown back to the user as
  // "Matches your interest in Live Music", and a lowercased tag reads as a bug.
  const eventTags = [...(event.tags || []), event.type]
    .filter(Boolean)
    .map((t) => ({ label: String(t), key: normalise(String(t)) }));

  if (eventTags.length === 0) return { score: 0, matched: [] as string[] };

  const stated = new Set(interests.map(normalise));
  // Revealed preference counts, but less than a stated interest.
  const revealed = new Set(affinity.map(normalise));

  const matchedStated: string[] = [];
  const matchedRevealed: string[] = [];

  const seen = new Set<string>();
  eventTags.forEach(({ label, key }) => {
    if (seen.has(key)) return;
    seen.add(key);
    if (stated.has(key)) matchedStated.push(label);
    else if (revealed.has(key)) matchedRevealed.push(label);
  });

  const denominator = Math.max(1, Math.min(stated.size + revealed.size, seen.size));
  const raw = (matchedStated.length + 0.6 * matchedRevealed.length) / denominator;

  return { score: clamp01(raw), matched: [...matchedStated, ...matchedRevealed] };
};

/**
 * Closeness, decaying with distance.
 * A 3 km half-life: things in the same neighbourhood score high, things across
 * the city still register, things in another city effectively do not.
 */
export const proximityScore = (event: Event, coords: Coords | null) => {
  const km = distanceToEvent(coords, event);
  // Unknown distance is neutral rather than penalised — an event without
  // coordinates is not necessarily far away.
  if (km === null) return { score: 0.45, km: null as number | null };
  return { score: clamp01(Math.exp(-km / 3)), km };
};

/**
 * How well the timing sits.
 *
 * Peaks a couple of days out: tonight is often too late to plan for, and a
 * month away is not a decision anyone makes from a feed. Events already
 * started score zero.
 */
export const timingScore = (event: Event, now: Date) => {
  const start = getEventStart(event);
  if (!start) return 0.4;

  const hours = (start.getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return 0;
  if (hours < 4) return 0.55;
  if (hours <= 72) return 1;
  if (hours <= 168) return 0.8;
  if (hours <= 336) return 0.55;
  return 0.3;
};

/**
 * Social proof, peaked rather than monotonic.
 * An empty event reads as risky and a full one cannot be joined; the pull is
 * strongest when it is clearly happening but there is still room.
 */
export const socialProofScore = (event: Event) => {
  const going = Number(event.attendees || 0);
  const capacity = Number(event.maxAttendees || 0);

  if (capacity <= 0) return clamp01(going / 12);

  const fill = going / capacity;
  if (fill >= 1) return 0.15;
  // Peak around 70% full.
  return clamp01(1 - Math.abs(fill - 0.7) / 0.7);
};

/** Organizer reputation, neutral when they have no ratings yet. */
export const reputationScore = (averageStars?: number, ratingCount?: number) => {
  if (!ratingCount || !averageStars) return 0.5;
  const confidence = Math.min(1, ratingCount / 5);
  return clamp01(0.5 + ((averageStars - 3) / 2) * confidence);
};

/** Free is easy; beyond roughly what someone usually spends, appetite drops. */
export const priceFitScore = (event: Event, typicalSpend = 15) => {
  const cost = Number(event.cost || 0);
  if (cost === 0) return 1;
  const reference = Math.max(typicalSpend, 5);
  return clamp01(1 - (cost - reference) / (reference * 3));
};

/** Something already scrolled past should not lead the feed again. */
export const noveltyScore = (event: Event, seen?: Set<string>) =>
  seen?.has(String(event.id)) ? 0.2 : 1;

/**
 * Weather only bears on outdoor events, and only within the forecast horizon.
 * Beyond about three days a forecast is noise, so it is ignored rather than
 * pretended to be useful.
 */
export const weatherPenalty = (event: Event, weather: RecommendContext['weather']) => {
  if (!weather || weather.condition === 'good' || weather.withinDays > 3) return 0;

  const tags = [...(event.tags || []), event.type].filter(Boolean).map((t) => normalise(String(t)));
  const isOutdoor = tags.some((t) => ['outdoor', 'outdoors', 'park', 'beach', 'hiking', 'garden'].includes(t));
  return isOutdoor ? 0.8 : 0;
};

export function scoreEvent(event: Event, context: RecommendContext): ScoredEvent {
  const interest = interestScore(event, context.interests, context.affinityTags);
  const proximity = proximityScore(event, context.coords);
  const timing = timingScore(event, context.now);
  const social = socialProofScore(event);
  const reputation = reputationScore(
    (event as any).organizerRating,
    (event as any).organizerRatingCount
  );
  const price = priceFitScore(event, context.typicalSpend);
  const novelty = noveltyScore(event, context.seenEventIds);

  const contributions: { key: string; value: number; reason: string }[] = [
    {
      key: 'interest',
      value: WEIGHTS.interest * interest.score,
      reason: interest.matched.length
        ? `Matches your interest in ${interest.matched.slice(0, 2).join(' and ')}`
        : '',
    },
    {
      key: 'proximity',
      value: WEIGHTS.proximity * proximity.score,
      reason:
        proximity.km !== null && proximity.km < 5
          ? `Close by${proximity.km < 1 ? '' : ` — ${proximity.km.toFixed(1)} km`}`
          : '',
    },
    { key: 'timing', value: WEIGHTS.timing * timing, reason: timing >= 1 ? 'Happening soon' : '' },
    {
      key: 'social',
      value: WEIGHTS.socialProof * social,
      reason: social > 0.7 ? 'Filling up' : '',
    },
    {
      key: 'reputation',
      value: WEIGHTS.reputation * reputation,
      reason: reputation > 0.75 ? 'Well-rated organizer' : '',
    },
    { key: 'price', value: WEIGHTS.priceFit * price, reason: Number(event.cost || 0) === 0 ? 'Free' : '' },
    { key: 'novelty', value: WEIGHTS.novelty * novelty, reason: '' },
  ];

  const raw = contributions.reduce((total, c) => total + c.value, 0);
  const penalty = weatherPenalty(event, context.weather);

  const features: FeatureVector = {
    interest: interest.score,
    proximity: proximity.score,
    timing,
    socialProof: social,
    reputation,
    priceFit: price,
    novelty,
  };

  const reasons = contributions
    .filter((c) => c.reason)
    .sort((a, b) => b.value - a.value)
    .map((c) => c.reason)
    .slice(0, 2);

  if (penalty > 0) reasons.push('Outdoors — check the forecast');

  return { event, score: Math.max(0, raw - penalty), reasons, features };
}

/** Ranks a feed, highest first. */
export function rankEvents(events: Event[], context: RecommendContext): ScoredEvent[] {
  return events
    .map((event) => scoreEvent(event, context))
    .sort((a, b) => b.score - a.score);
}
