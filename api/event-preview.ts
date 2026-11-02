import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_lib';
import { renderEventPreview } from '../lib/eventPreview';

/**
 * Serves `/e/<eventId>` — the URL the app shares.
 *
 * Crawlers get Open Graph tags describing that specific event; browsers get an
 * immediate redirect into the app. See lib/eventPreview for why this cannot be
 * done in the client.
 *
 * Reads are public under firestore.rules ("Discovery is public"), so nothing
 * here is privileged — the admin SDK is used only because it is already wired
 * up for the other functions.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const raw = request.query.id;
  const eventId = (Array.isArray(raw) ? raw[0] : raw || '').trim();

  // Firestore document ids cannot contain a slash, and anything exotic here is
  // a probe rather than a real share link.
  if (!eventId || eventId.length > 128 || /[/\s]/.test(eventId)) {
    return response.status(400).json({ error: 'A valid event id is required' });
  }

  // Built from the deployment's own host so a preview deploy previews itself.
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || '');
  const origin = /^[a-z0-9.:-]+$/i.test(host)
    ? `https://${host}`
    : 'https://thethirdspaceapp.com';

  let event;
  try {
    const snapshot = await getAdminDb().collection('events').doc(eventId).get();
    // A missing or cancelled event still renders: the redirect lands in the
    // app, which explains the situation far better than a 404 page would.
    if (snapshot.exists && snapshot.get('status') !== 'cancelled') {
      event = snapshot.data();
    }
  } catch (error) {
    // A preview is not worth failing the link over — fall through to the
    // generic card and let the app load.
    console.error('Event preview lookup failed:', error);
  }

  const html = renderEventPreview({
    event,
    eventId,
    origin,
    fallbackImage: `${origin}/icons/icon-512.png`,
  });

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Crawlers re-fetch often and several may hit the same link at once; the
  // stale window keeps an edited event from being wrong for long.
  response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  return response.status(200).send(html);
}
