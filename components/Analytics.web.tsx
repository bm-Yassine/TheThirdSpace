import React from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';

/**
 * Analytics — web.
 *
 * `@vercel/analytics/react` rather than `/next`: this is an Expo Router app on
 * React Native Web, not Next.js, so the Next entry point does not apply. The
 * component injects its script through an effect and renders nothing, which is
 * what makes it safe inside React Native Web's renderer — RN Web cannot render
 * a raw <script> node.
 *
 * Reporting only happens on Vercel-hosted pages; locally it is inert, so there
 * is no need to gate it on an environment flag.
 */
export default function Analytics() {
  return <VercelAnalytics />;
}

/**
 * A custom event.
 *
 * Deliberately thin, and deliberately never passed anything identifying — no
 * uid, email or event id that resolves to a person. The privacy policy says
 * analytics are aggregate, and this is the function that has to keep that
 * promise true.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never break a user action.
  }
}
