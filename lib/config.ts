/**
 * Runtime feature flags.
 *
 * Mock events used to be merged unconditionally into the live feed, which meant
 * the production site showed seed data next to real user events. They are now
 * opt-in: set EXPO_PUBLIC_USE_MOCK_EVENTS=true for a populated local dev feed.
 */
export const USE_MOCK_EVENTS = process.env.EXPO_PUBLIC_USE_MOCK_EVENTS === 'true';

/** Stripe publishable key; when absent the payment screen runs in demo mode. */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

/** Base URL of the payments API (Vercel serverless functions). */
export const PAYMENTS_API_BASE_URL =
  process.env.EXPO_PUBLIC_PAYMENTS_API_BASE_URL || '/api';

export const STRIPE_ENABLED = Boolean(STRIPE_PUBLISHABLE_KEY);
