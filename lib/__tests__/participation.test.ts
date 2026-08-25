import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  counterChanges,
  decideJoinOutcome,
  decidePromotionOutcome,
  isAwaitingPayment,
  normalizeStatus,
} from '../participation';
import type { AttendeeStatus } from '../types';

describe('normalizeStatus', () => {
  it('maps the legacy "approved" value onto "confirmed"', () => {
    assert.equal(normalizeStatus('approved'), 'confirmed');
  });

  it('passes current values through', () => {
    (['confirmed', 'pending', 'waitlisted', 'declined'] as AttendeeStatus[]).forEach((status) =>
      assert.equal(normalizeStatus(status), status)
    );
  });

  it('defaults unknown values to pending rather than granting a place', () => {
    assert.equal(normalizeStatus(undefined), 'pending');
    assert.equal(normalizeStatus('nonsense'), 'pending');
  });
});

describe('counterChanges', () => {
  it('a first confirmed join increments only the attendee count', () => {
    assert.deepEqual(counterChanges(null, 'confirmed'), { attendees: 1 });
  });

  it('leaving a confirmed place decrements it', () => {
    assert.deepEqual(counterChanges('confirmed', null), { attendees: -1 });
  });

  it('approval moves the count from pending to attendees in one step', () => {
    assert.deepEqual(counterChanges('pending', 'confirmed'), { pendingCount: -1, attendees: 1 });
  });

  it('waitlist promotion moves waitlist to attendees', () => {
    assert.deepEqual(counterChanges('waitlisted', 'confirmed'), {
      waitlistCount: -1,
      attendees: 1,
    });
  });

  it('declined feeds no counter, so approving a declined person only adds', () => {
    assert.deepEqual(counterChanges('declined', 'confirmed'), { attendees: 1 });
    assert.deepEqual(counterChanges('confirmed', 'declined'), { attendees: -1 });
  });

  it('a no-op transition changes nothing', () => {
    assert.deepEqual(counterChanges('confirmed', 'confirmed'), {});
    assert.deepEqual(counterChanges('declined', null), {});
    assert.deepEqual(counterChanges(null, 'declined'), {});
  });

  it('every transition is balanced — counters never drift', () => {
    const states: (AttendeeStatus | null)[] = [
      null,
      'pending',
      'confirmed',
      'waitlisted',
      'declined',
    ];

    // Applying a transition and then its reverse must return to zero.
    states.forEach((from) => {
      states.forEach((to) => {
        const forward = counterChanges(from, to);
        const backward = counterChanges(to, from);
        const net: Record<string, number> = {};
        [forward, backward].forEach((changes) =>
          Object.entries(changes).forEach(([field, amount]) => {
            net[field] = (net[field] || 0) + amount;
          })
        );
        Object.entries(net).forEach(([field, amount]) =>
          assert.equal(amount, 0, `${from} -> ${to} -> ${from} left ${field} at ${amount}`)
        );
      });
    });
  });
});

describe('decideJoinOutcome', () => {
  const base = {
    confirmedCount: 0,
    maxAttendees: 0,
    cost: 0,
    requiresApproval: false,
    paymentCompleted: false,
  };

  it('a free, open, uncapped event confirms immediately', () => {
    assert.deepEqual(decideJoinOutcome(base), { status: 'confirmed', reason: 'direct' });
  });

  it('an unpaid place is held as pending payment, never confirmed', () => {
    assert.deepEqual(decideJoinOutcome({ ...base, cost: 25 }), {
      status: 'pending',
      reason: 'payment',
    });
  });

  it('payment takes priority over approval and over capacity', () => {
    const outcome = decideJoinOutcome({
      ...base,
      cost: 25,
      requiresApproval: true,
      maxAttendees: 5,
      confirmedCount: 5,
    });
    assert.equal(outcome.reason, 'payment');
  });

  it('a full event waitlists rather than confirming', () => {
    assert.deepEqual(decideJoinOutcome({ ...base, maxAttendees: 10, confirmedCount: 10 }), {
      status: 'waitlisted',
      reason: 'waitlist',
    });
  });

  it('an over-subscribed event still waitlists', () => {
    assert.equal(
      decideJoinOutcome({ ...base, maxAttendees: 10, confirmedCount: 12 }).status,
      'waitlisted'
    );
  });

  it('maxAttendees of 0 means unlimited, not "full"', () => {
    assert.equal(
      decideJoinOutcome({ ...base, maxAttendees: 0, confirmedCount: 500 }).status,
      'confirmed'
    );
  });

  it('an approval-gated event with room goes pending on approval', () => {
    assert.deepEqual(decideJoinOutcome({ ...base, requiresApproval: true }), {
      status: 'pending',
      reason: 'approval',
    });
  });

  it('a completed payment lets the normal rules apply', () => {
    assert.deepEqual(decideJoinOutcome({ ...base, cost: 25, paymentCompleted: true }), {
      status: 'confirmed',
      reason: 'direct',
    });
  });

  it('the last remaining place is still given out', () => {
    assert.equal(
      decideJoinOutcome({ ...base, maxAttendees: 10, confirmedCount: 9 }).status,
      'confirmed'
    );
  });
});

describe('decidePromotionOutcome', () => {
  it('promotes straight in when nothing is owed', () => {
    assert.deepEqual(
      decidePromotionOutcome({ cost: 0, paymentCompleted: false, requiresApproval: false }),
      { status: 'confirmed', reason: 'promoted' }
    );
  });

  it('does not give a free place to someone who owes money', () => {
    assert.deepEqual(
      decidePromotionOutcome({ cost: 20, paymentCompleted: false, requiresApproval: false }),
      { status: 'pending', reason: 'payment' }
    );
  });

  it('does not bypass organizer approval', () => {
    assert.deepEqual(
      decidePromotionOutcome({ cost: 0, paymentCompleted: false, requiresApproval: true }),
      { status: 'pending', reason: 'approval' }
    );
  });

  it('promotes a paid-up person on a paid event', () => {
    assert.equal(
      decidePromotionOutcome({ cost: 20, paymentCompleted: true, requiresApproval: false }).status,
      'confirmed'
    );
  });
});

describe('isAwaitingPayment', () => {
  it('flags an unpaid pending participant so the organizer sees no approve button', () => {
    assert.equal(
      isAwaitingPayment({ status: 'pending', reason: 'payment', paymentStatus: 'pending' }),
      true
    );
  });

  it('does not flag a genuine approval request', () => {
    assert.equal(
      isAwaitingPayment({ status: 'pending', reason: 'approval', paymentStatus: 'not_required' }),
      false
    );
  });

  it('does not flag someone who has since paid', () => {
    assert.equal(
      isAwaitingPayment({ status: 'pending', reason: 'payment', paymentStatus: 'completed' }),
      false
    );
  });
});
