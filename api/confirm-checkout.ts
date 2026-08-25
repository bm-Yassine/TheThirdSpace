import type { VercelRequest, VercelResponse } from '@vercel/node';
import { confirmPaidParticipant, getStripe, requireUid } from './_lib';

/**
 * Confirms a Checkout Session on return from Stripe.
 *
 * The webhook is authoritative, but it can land a second or two after the user
 * is redirected back. This lets the app settle immediately by asking Stripe
 * directly whether the session is paid. It is safe because it verifies the
 * session with Stripe and checks the session belongs to the calling user;
 * confirmPaidParticipant is idempotent, so racing the webhook is harmless.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uid = await requireUid(request.headers.authorization);
    const { sessionId } = request.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
      return response.status(400).json({ error: 'sessionId is required' });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.metadata?.uid !== uid) {
      return response.status(403).json({ error: 'This session belongs to another user' });
    }
    if (session.payment_status !== 'paid') {
      return response.status(200).json({ paid: false, status: session.payment_status });
    }

    const eventId = session.metadata?.eventId;
    if (eventId) await confirmPaidParticipant(eventId, uid);

    return response.status(200).json({ paid: true, eventId });
  } catch (error: any) {
    console.error('confirm-checkout failed:', error);
    const isAuthError = /Authorization|token/i.test(error?.message || '');
    return response.status(isAuthError ? 401 : 500).json({
      error: error?.message || 'Could not confirm payment',
    });
  }
}
