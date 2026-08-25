import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb, getStripe, requireUid } from './_lib';

/**
 * Creates a Stripe Checkout Session for joining a paid event.
 *
 * The price is read from the event document server-side rather than trusted
 * from the request body — otherwise anyone could post `amount: 1` and buy a
 * place at any price they liked.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uid = await requireUid(request.headers.authorization);
    const { eventId, returnUrl } = request.body || {};

    if (!eventId || typeof eventId !== 'string') {
      return response.status(400).json({ error: 'eventId is required' });
    }

    const db = getAdminDb();
    const eventSnap = await db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      return response.status(404).json({ error: 'Event not found' });
    }

    const event = eventSnap.data() as any;
    const amount = Number(event.cost || 0);
    if (amount <= 0) {
      return response.status(400).json({ error: 'This event is free' });
    }
    if (event.createdBy === uid) {
      return response.status(400).json({ error: 'You cannot pay to join your own event' });
    }

    const origin =
      (typeof returnUrl === 'string' && returnUrl) ||
      request.headers.origin ||
      `https://${request.headers.host}`;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: event.title || 'Event ticket',
              description: event.location ? `at ${event.location}` : undefined,
            },
          },
        },
      ],
      // Read back by the webhook to settle the right participant.
      metadata: { eventId, uid },
      success_url: `${origin}/activity_detail?eventId=${eventId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/activity_detail?eventId=${eventId}&payment=cancelled`,
    });

    return response.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('create-checkout-session failed:', error);
    const isAuthError = /Authorization|token/i.test(error?.message || '');
    return response.status(isAuthError ? 401 : 500).json({
      error: error?.message || 'Could not start checkout',
    });
  }
}
