import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb, requireUid } from './_lib';

/**
 * Delivers a notification as a push message.
 *
 * Goes through Expo's push service rather than APNs/FCM directly, so one
 * endpoint serves iOS and Android without per-platform credentials. There is
 * no web branch: Expo has no web push, which would need a service worker and
 * VAPID keys. On web the in-app inbox is the delivery mechanism.
 *
 * Tokens that Expo reports as dead are removed, otherwise a user who
 * reinstalls accumulates tokens that fail forever.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // The caller must be signed in. Anyone can notify anyone — the organizer
    // approving you, or whoever messaged you — but it cannot be anonymous.
    const senderUid = await requireUid(request.headers.authorization);
    const { targetUid, title, body, data } = request.body || {};

    if (!targetUid || typeof targetUid !== 'string') {
      return response.status(400).json({ error: 'targetUid is required' });
    }
    if (typeof title !== 'string' || typeof body !== 'string') {
      return response.status(400).json({ error: 'title and body are required' });
    }
    if (targetUid === senderUid) {
      return response.status(200).json({ sent: 0, reason: 'self' });
    }

    const db = getAdminDb();
    const tokensSnap = await db.collection('users').doc(targetUid).collection('pushTokens').get();
    const tokens = tokensSnap.docs
      .map((doc) => (doc.data() as any).token)
      .filter((token): token is string => typeof token === 'string' && token.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      // Not an error: the record is already in their inbox, and most users
      // are on web where there is no token to send to.
      return response.status(200).json({ sent: 0, reason: 'no tokens' });
    }

    const messages = tokens.map((to) => ({
      to,
      title: title.slice(0, 120),
      body: body.slice(0, 300),
      data: data && typeof data === 'object' ? data : {},
      sound: 'default' as const,
    }));

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json().catch(() => null);
    const tickets: any[] = result?.data ?? [];

    // Prune tokens Expo says are gone, so they do not fail forever.
    const dead = tickets
      .map((ticket, index) => ({ ticket, token: tokens[index] }))
      .filter(({ ticket }) => ticket?.details?.error === 'DeviceNotRegistered')
      .map(({ token }) => token);

    await Promise.all(
      dead.map((token) =>
        db
          .collection('users')
          .doc(targetUid)
          .collection('pushTokens')
          .doc(token.replace(/[^\w-]/g, '_'))
          .delete()
          .catch(() => undefined)
      )
    );

    return response.status(200).json({ sent: tokens.length - dead.length, pruned: dead.length });
  } catch (error: any) {
    console.error('send-push failed:', error);
    const isAuthError = /Authorization|token/i.test(error?.message || '');
    return response.status(isAuthError ? 401 : 500).json({
      error: error?.message || 'Could not send the notification',
    });
  }
}
