import type { AttendeeStatus, AttendeeReason } from './types';

/**
 * The participation state machine, kept free of Firebase so it can be reasoned
 * about and tested on its own. `Backend/firebase.ts` applies these decisions
 * inside a Firestore transaction.
 */

/** Which denormalised counter on the event document each status feeds. */
export const COUNTER_FIELD: Partial<Record<AttendeeStatus, string>> = {
  confirmed: 'attendees',
  pending: 'pendingCount',
  waitlisted: 'waitlistCount',
};

/**
 * Maps historical status values onto the current vocabulary. Documents written
 * before the participants sub-collection used `'approved'` where we now use
 * `'confirmed'`.
 */
export const normalizeStatus = (value: unknown): AttendeeStatus => {
  if (value === 'approved') return 'confirmed';
  if (
    value === 'confirmed' ||
    value === 'pending' ||
    value === 'waitlisted' ||
    value === 'declined'
  ) {
    return value;
  }
  return 'pending';
};

/**
 * Counter changes for a status transition, as plain numbers.
 * `from === null` is a first join; `to === null` is a removal.
 * `declined` deliberately feeds no counter.
 */
export const counterChanges = (
  from: AttendeeStatus | null,
  to: AttendeeStatus | null
): Record<string, number> => {
  const fromField = from ? COUNTER_FIELD[from] : undefined;
  const toField = to ? COUNTER_FIELD[to] : undefined;

  // A transition within the same counter (or between two uncounted states)
  // must not touch anything.
  if (fromField === toField) return {};

  const delta: Record<string, number> = {};
  if (fromField) delta[fromField] = -1;
  if (toField) delta[toField] = 1;
  return delta;
};

export type JoinContext = {
  /** Confirmed attendees already holding a place. */
  confirmedCount: number;
  /** 0 means unlimited. */
  maxAttendees: number;
  cost: number;
  requiresApproval: boolean;
  paymentCompleted: boolean;
};

/**
 * Decides which lane a joining user lands in.
 *
 * Order matters: an unpaid place is never held as confirmed, a full event
 * waitlists before it considers approval, and approval only applies once there
 * is actually a place to give.
 */
export const decideJoinOutcome = (
  context: JoinContext
): { status: AttendeeStatus; reason: AttendeeReason } => {
  const needsPayment = context.cost > 0 && !context.paymentCompleted;
  if (needsPayment) return { status: 'pending', reason: 'payment' };

  const isFull =
    context.maxAttendees > 0 && context.confirmedCount >= context.maxAttendees;
  if (isFull) return { status: 'waitlisted', reason: 'waitlist' };

  if (context.requiresApproval) return { status: 'pending', reason: 'approval' };

  return { status: 'confirmed', reason: 'direct' };
};

/**
 * Decides where a waitlisted user goes when a place frees up. Promotion does
 * not skip payment or approval — it only moves them out of the queue.
 */
export const decidePromotionOutcome = (context: {
  cost: number;
  paymentCompleted: boolean;
  requiresApproval: boolean;
}): { status: AttendeeStatus; reason: AttendeeReason } => {
  const owesPayment = context.cost > 0 && !context.paymentCompleted;
  if (owesPayment) return { status: 'pending', reason: 'payment' };
  if (context.requiresApproval) return { status: 'pending', reason: 'approval' };
  return { status: 'confirmed', reason: 'promoted' };
};

/** True when the organizer must not be offered an "approve" action. */
export const isAwaitingPayment = (participant: {
  status?: unknown;
  reason?: unknown;
  paymentStatus?: unknown;
}): boolean =>
  normalizeStatus(participant.status) === 'pending' &&
  participant.reason === 'payment' &&
  participant.paymentStatus !== 'completed';
