import type { VercelRequest, VercelResponse } from '@vercel/node';
import { confirmPaidParticipant, getAdminDb, getStripe } from './_lib';

/**
 * Stripe webhook. This is the authoritative confirmation of payment —
 * the browser returning to a success URL is only a hint, since a user can
 * navigate there directly.
 */
export const config = {
  // Signature verification needs the exact bytes Stripe sent.
  api: { bodyParser: false },
};

const readRawBody = (request: VercelRequest): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return response.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' });
  }

  let event;
  try {
    const rawBody = await readRawBody(request);
    const signature = request.headers['stripe-signature'] as string;
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error?.message);
    return response.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const eventId = session.metadata?.eventId;
      const uid = session.metadata?.uid;

      if (eventId && uid) {
        const db = getAdminDb();
        await db.collection('payments').doc(session.id).set(
          {
            id: session.id,
            eventId,
            payerUid: uid,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency,
            method: 'stripe',
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        );

        await confirmPaidParticipant(eventId, uid);
      }
    }

    return response.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook handling failed:', error);
    // A non-2xx tells Stripe to retry, which is what we want on a transient error.
    return response.status(500).json({ error: 'Handler failed' });
  }
}
