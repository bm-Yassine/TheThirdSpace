/**
 * Runtime feature flags.
 *
 * Mock events used to be merged unconditionally into the live feed, which meant
 * the production site showed seed data next to real user events. They are now
 * opt-in: set EXPO_PUBLIC_USE_MOCK_EVENTS=true for a populated local dev feed.
 */
export const USE_MOCK_EVENTS = process.env.EXPO_PUBLIC_USE_MOCK_EVENTS === 'true';

/**
 * Demo mode: runs the app against a seeded in-memory store with a signed-in
 * demo user and no Firebase. Lets someone click through every screen — profile,
 * approvals, chat, ratings — without creating an account, which is what a
 * portfolio visitor should be able to do.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

/** Stripe publishable key; when absent the payment screen runs in demo mode. */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

/** Base URL of the payments API (Vercel serverless functions). */
export const PAYMENTS_API_BASE_URL =
  process.env.EXPO_PUBLIC_PAYMENTS_API_BASE_URL || '/api';

export const STRIPE_ENABLED = Boolean(STRIPE_PUBLISHABLE_KEY);

/**
 * Where the map opens when there are no located events to centre on.
 * Paris — the app's launch city.
 */
export const DEFAULT_MAP_CENTER = { latitude: 48.8566, longitude: 2.3522 };

/**
 * Canonical public URL, used to build shareable event links.
 * Falls back to the browser's own origin on web so preview deploys share
 * links that point at themselves rather than at production.
 */
export const PUBLIC_SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL || 'https://thethirdspaceapp.com';
