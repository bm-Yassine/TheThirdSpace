/**
 * Analytics — native no-op.
 *
 * Metro resolves `Analytics.web.tsx` on web and this file on iOS and Android,
 * so the web-only Vercel package never reaches a native bundle. Importing it
 * unguarded would pull `document` into a runtime that has none.
 *
 * Vercel Web Analytics only reports on Vercel-hosted pages anyway, so there is
 * nothing meaningful to do here.
 */
export default function Analytics() {
  return null;
}

/** No-op so call sites do not need a platform check around every event. */
export function trackEvent(_name: string, _properties?: Record<string, string | number | boolean>) {
  // Intentionally empty on native.
}
