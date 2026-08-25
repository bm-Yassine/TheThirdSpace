import Stripe from 'stripe';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Shared server-side helpers for the Vercel serverless functions.
 *
 * Everything in this directory runs on the server only. Secrets here
 * (STRIPE_SECRET_KEY, the service account) are plain Vercel environment
 * variables with no EXPO_PUBLIC_ prefix, so they are never bundled into
 * the client.
 */

export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
};

/**
 * Firebase Admin, authenticated with a service account supplied as a
 * base64-encoded JSON blob (FIREBASE_SERVICE_ACCOUNT_B64) so it survives
 * being pasted into an environment variable field.
 */
export const getAdminDb = () => {
  if (!getApps().length) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not configured');

    const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  return getFirestore(getApp());
};

/** Verifies the caller's Firebase ID token and returns their uid. */
export const requireUid = async (authorizationHeader?: string): Promise<string> => {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing Authorization header');

  const { getAuth } = await import('firebase-admin/auth');
  getAdminDb(); // ensures the admin app is initialised
  const decoded = await getAuth().verifyIdToken(token);
  return decoded.uid;
};

/** Same status transition logic as the client, applied with admin privileges. */
export const confirmPaidParticipant = async (eventId: string, uid: string) => {
  const db = getAdminDb();
  const eventRef = db.collection('events').doc(eventId);
  const participantRef = eventRef.collection('participants').doc(uid);
  const commitmentRef = db.collection('users').doc(uid).collection('commitments').doc(eventId);

  await db.runTransaction(async (transaction) => {
    const [eventSnap, participantSnap] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(participantRef),
    ]);
    if (!eventSnap.exists || !participantSnap.exists) return;

    const event = eventSnap.data() as any;
    const participant = participantSnap.data() as any;

    // Idempotent: a webhook that is delivered twice must not double-count.
    if (participant.paymentStatus === 'completed') return;

    const cap = Number(event.maxAttendees || 0);
    const isFull = cap > 0 && Number(event.attendees || 0) >= cap;

    const nextStatus = event.requiresApproval ? 'pending' : isFull ? 'waitlisted' : 'confirmed';
    const previousStatus = participant.status === 'approved' ? 'confirmed' : participant.status;

    const counterField: Record<string, string> = {
      confirmed: 'attendees',
      pending: 'pendingCount',
      waitlisted: 'waitlistCount',
    };

    const updates: Record<string, any> = { updatedAt: new Date() };
    const fromField = counterField[previousStatus];
    const toField = counterField[nextStatus];
    if (fromField !== toField) {
      const { FieldValue } = await import('firebase-admin/firestore');
      if (fromField) updates[fromField] = FieldValue.increment(-1);
      if (toField) updates[toField] = FieldValue.increment(1);
    }

    transaction.update(eventRef, updates);
    transaction.update(participantRef, {
      status: nextStatus,
      paymentStatus: 'completed',
      updatedAt: new Date(),
    });
    transaction.set(
      commitmentRef,
      { status: nextStatus, paymentStatus: 'completed', updatedAt: new Date() },
      { merge: true }
    );
  });
};
