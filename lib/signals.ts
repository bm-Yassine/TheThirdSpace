import { auth, db } from '../Backend/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { DEMO_MODE } from './config';

/**
 * Interaction logging.
 *
 * The scorer in `lib/recommend.ts` uses hand-chosen weights because there is
 * nothing yet to fit them against. This is what changes that: every impression,
 * open, favourite and join becomes a labelled example. Without recording it
 * from the start there is no way to move past guessed weights later, and the
 * data cannot be recovered retrospectively.
 *
 * Deliberately minimal — event id, action, timestamp and the score the ranker
 * gave. No dwell tracking, no scroll telemetry, nothing that would need to be
 * disclosed beyond what the privacy policy already says.
 */

export type SignalAction = 'impression' | 'open' | 'favorite' | 'unfavorite' | 'join' | 'leave';

/** Impressions are frequent; batching keeps this off the critical path. */
let pending: {
  eventId: string;
  action: SignalAction;
  score?: number;
  /** Per-signal values at the moment of the impression. */
  features?: Record<string, number>;
  at: number;
}[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_AFTER_MS = 8000;
const MAX_BATCH = 40;

const flush = async () => {
  flushTimer = null;
  const batch = pending;
  pending = [];
  if (batch.length === 0) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    // One document per batch rather than per event: cheaper, and the shape is
    // still trivially expandable into rows for training.
    const ref = doc(collection(db, 'users', user.uid, 'signals'));
    await setDoc(ref, { id: ref.id, events: batch, recordedAt: new Date() });
  } catch {
    // Telemetry must never surface to the user or block anything.
  }
};

export const recordSignal = (
  eventId: string,
  action: SignalAction,
  score?: number,
  /**
   * The feature values behind the score. Required to ever fit the weights: a
   * composite score says nothing about which signal earned it, so without
   * these the weights can only ever be guesses, and the data cannot be
   * recovered retrospectively.
   */
  features?: Record<string, number>
) => {
  // Demo mode has no user and no database; logging there would be noise.
  if (DEMO_MODE || !auth.currentUser) return;

  pending.push({ eventId: String(eventId), action, score, features, at: Date.now() });

  if (pending.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_AFTER_MS);
};

/** Called when the feed unmounts so the tail of a session is not lost. */
export const flushSignals = () => {
  if (flushTimer) clearTimeout(flushTimer);
  return flush();
};
