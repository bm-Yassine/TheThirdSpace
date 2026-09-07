import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  interestScore,
  noveltyScore,
  priceFitScore,
  proximityScore,
  rankEvents,
  reputationScore,
  scoreEvent,
  socialProofScore,
  timingScore,
  weatherPenalty,
  type RecommendContext,
} from '../recommend';
import type { Event } from '../types';

const NOW = new Date('2026-09-10T12:00:00');
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const makeEvent = (over: Partial<Event> = {}): Event =>
  ({
    id: Math.random().toString(36).slice(2),
    title: 'Event',
    organizer: { name: 'Someone' },
    startsAt: hoursFromNow(48),
    tags: [],
    cost: 0,
    ...over,
  }) as Event;

const context = (over: Partial<RecommendContext> = {}): RecommendContext => ({
  interests: [],
  coords: null,
  now: NOW,
  ...over,
});

describe('interestScore', () => {
  it('rewards a stated interest matching a tag', () => {
    const r = interestScore(makeEvent({ tags: ['Live Music'] }), ['Live Music']);
    assert.ok(r.score > 0, 'expected a positive match');
    // Original casing is preserved, because this string is shown to the user.
    assert.deepEqual(r.matched, ['Live Music']);
  });

  it('is case-insensitive', () => {
    assert.ok(interestScore(makeEvent({ tags: ['LIVE MUSIC'] }), ['live music']).score > 0);
  });

  it('scores zero when nothing overlaps', () => {
    assert.equal(interestScore(makeEvent({ tags: ['Chess'] }), ['Bouldering']).score, 0);
  });

  it('weighs a revealed preference below a stated one', () => {
    const stated = interestScore(makeEvent({ tags: ['Food'] }), ['Food'], []);
    const revealed = interestScore(makeEvent({ tags: ['Food'] }), [], ['Food']);
    assert.ok(revealed.score < stated.score, 'revealed should count for less');
    assert.ok(revealed.score > 0, 'revealed should still count');
  });

  it('does not let a heavily tagged event win on tag count alone', () => {
    const focused = interestScore(makeEvent({ tags: ['Jazz'] }), ['Jazz']);
    const spammy = interestScore(
      makeEvent({ tags: ['Jazz', 'A', 'B', 'C', 'D', 'E', 'F'] }),
      ['Jazz']
    );
    assert.ok(spammy.score <= focused.score, 'tag spam should not outrank a focused match');
  });

  it('returns zero for an untagged event rather than throwing', () => {
    assert.equal(interestScore(makeEvent({ tags: [], type: undefined }), ['Food']).score, 0);
  });
});

describe('proximityScore', () => {
  it('scores a nearby event above a distant one', () => {
    const near = proximityScore(makeEvent({ latitude: 48.86, longitude: 2.35 }), PARIS);
    const far = proximityScore(makeEvent({ latitude: 51.5, longitude: -0.12 }), PARIS);
    assert.ok(near.score > far.score);
    assert.ok(far.score < 0.01, 'another city should be effectively zero');
  });

  it('is neutral, not punitive, when the distance is unknown', () => {
    const r = proximityScore(makeEvent(), null);
    assert.equal(r.km, null);
    assert.ok(r.score > 0.3 && r.score < 0.6, 'unknown distance should sit mid-range');
  });
});

describe('timingScore', () => {
  it('peaks inside the next three days', () => {
    assert.equal(timingScore(makeEvent({ startsAt: hoursFromNow(48) }), NOW), 1);
  });

  it('scores an event already started at zero', () => {
    assert.equal(timingScore(makeEvent({ startsAt: hoursFromNow(-1) }), NOW), 0);
  });

  it('discounts something imminent, which is hard to plan for', () => {
    assert.ok(timingScore(makeEvent({ startsAt: hoursFromNow(2) }), NOW) < 1);
  });

  it('decays for the distant future', () => {
    const week = timingScore(makeEvent({ startsAt: hoursFromNow(24 * 6) }), NOW);
    const month = timingScore(makeEvent({ startsAt: hoursFromNow(24 * 40) }), NOW);
    assert.ok(month < week);
  });
});

describe('socialProofScore', () => {
  it('peaks when an event is clearly happening but has room', () => {
    const healthy = socialProofScore(makeEvent({ attendees: 7, maxAttendees: 10 }));
    const empty = socialProofScore(makeEvent({ attendees: 0, maxAttendees: 10 }));
    assert.ok(healthy > empty, 'an empty event reads as risky');
  });

  it('drops sharply once full, since it cannot be joined', () => {
    const full = socialProofScore(makeEvent({ attendees: 10, maxAttendees: 10 }));
    assert.ok(full < 0.2);
  });

  it('handles uncapped events without dividing by zero', () => {
    const r = socialProofScore(makeEvent({ attendees: 6, maxAttendees: 0 }));
    assert.ok(Number.isFinite(r) && r > 0 && r <= 1);
  });
});

describe('reputationScore', () => {
  it('is neutral for an organizer with no ratings', () => {
    assert.equal(reputationScore(undefined, 0), 0.5);
  });

  it('trusts a well-rated organizer more once there are several ratings', () => {
    const few = reputationScore(5, 1);
    const many = reputationScore(5, 10);
    assert.ok(many > few, 'confidence should grow with rating count');
  });

  it('penalises a poorly rated organizer', () => {
    assert.ok(reputationScore(1.5, 10) < 0.5);
  });
});

describe('priceFitScore', () => {
  it('scores free events highest', () => {
    assert.equal(priceFitScore(makeEvent({ cost: 0 })), 1);
  });

  it('falls off above what the user typically spends', () => {
    const usual = priceFitScore(makeEvent({ cost: 15 }), 15);
    const steep = priceFitScore(makeEvent({ cost: 90 }), 15);
    assert.ok(steep < usual);
    assert.ok(steep >= 0, 'never negative');
  });
});

describe('weatherPenalty', () => {
  it('penalises an outdoor event in poor weather within the forecast window', () => {
    const p = weatherPenalty(makeEvent({ tags: ['Outdoor'] }), { condition: 'poor', withinDays: 1 });
    assert.ok(p > 0);
  });

  it('leaves indoor events alone', () => {
    assert.equal(weatherPenalty(makeEvent({ tags: ['Indoor'] }), { condition: 'poor', withinDays: 1 }), 0);
  });

  it('ignores forecasts beyond the horizon, where they are noise', () => {
    assert.equal(weatherPenalty(makeEvent({ tags: ['Outdoor'] }), { condition: 'poor', withinDays: 9 }), 0);
  });

  it('does nothing without weather data', () => {
    assert.equal(weatherPenalty(makeEvent({ tags: ['Outdoor'] }), null), 0);
  });
});

describe('noveltyScore', () => {
  it('demotes something already seen', () => {
    const e = makeEvent({ id: 'x' });
    assert.ok(noveltyScore(e, new Set(['x'])) < noveltyScore(e, new Set()));
  });
});

describe('rankEvents', () => {
  it('puts a matching, nearby, well-timed event first', () => {
    const match = makeEvent({
      id: 'match',
      tags: ['Live Music'],
      latitude: 48.857,
      longitude: 2.353,
      attendees: 7,
      maxAttendees: 10,
    });
    const mismatch = makeEvent({
      id: 'mismatch',
      tags: ['Chess'],
      latitude: 51.5,
      longitude: -0.12,
      attendees: 0,
      maxAttendees: 10,
      startsAt: hoursFromNow(24 * 40),
    });

    const ranked = rankEvents([mismatch, match], context({ interests: ['Live Music'], coords: PARIS }));
    assert.equal(String(ranked[0].event.id), 'match');
  });

  it('explains why, in plain language', () => {
    const [top] = rankEvents(
      [makeEvent({ tags: ['Live Music'], latitude: 48.857, longitude: 2.353 })],
      context({ interests: ['Live Music'], coords: PARIS })
    );
    assert.ok(top.reasons.length > 0, 'every recommendation should carry a reason');
    assert.ok(top.reasons.some((r) => r.includes('Live Music')));
  });

  it('never returns a negative score', () => {
    const grim = makeEvent({ tags: ['Outdoor'], startsAt: hoursFromNow(-5), cost: 500 });
    const [scored] = rankEvents([grim], context({ weather: { condition: 'poor', withinDays: 1 } }));
    assert.ok(scored.score >= 0);
  });

  it('is deterministic — the same input ranks the same way twice', () => {
    const events = [makeEvent({ id: 'a', tags: ['X'] }), makeEvent({ id: 'b', tags: ['Y'] })];
    const ctx = context({ interests: ['X'] });
    const first = rankEvents(events, ctx).map((r) => String(r.event.id));
    const second = rankEvents(events, ctx).map((r) => String(r.event.id));
    assert.deepEqual(first, second);
  });

  it('still ranks sensibly with an empty profile (the cold-start case)', () => {
    const soon = makeEvent({ id: 'soon', startsAt: hoursFromNow(30), attendees: 7, maxAttendees: 10 });
    const distantFuture = makeEvent({ id: 'later', startsAt: hoursFromNow(24 * 45) });
    const ranked = rankEvents([distantFuture, soon], context());
    assert.equal(String(ranked[0].event.id), 'soon');
  });
});

describe('scoreEvent', () => {
  it('caps reasons so a card is not overwhelmed', () => {
    const scored = scoreEvent(
      makeEvent({ tags: ['Live Music'], latitude: 48.857, longitude: 2.353, cost: 0, attendees: 7, maxAttendees: 10 }),
      context({ interests: ['Live Music'], coords: PARIS })
    );
    assert.ok(scored.reasons.length <= 3);
  });
});
