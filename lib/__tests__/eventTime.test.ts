import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  combineDateAndTime,
  formatEventDate,
  getEventEnd,
  getEventStart,
  hasEventEnded,
  isUpcoming,
  byStartAscending,
  formatEventTimeRange,
  formatEventDateLabel,
  DEFAULT_EVENT_DURATION_MINUTES,
} from '../eventTime';

const iso = (date: Date) => date.toISOString();
const minutes = (n: number) => n * 60 * 1000;

describe('combineDateAndTime', () => {
  it('builds a local date from YYYY-MM-DD and HH:mm', () => {
    const result = combineDateAndTime('2026-03-14', '18:30');
    assert.ok(result);
    assert.equal(result!.getFullYear(), 2026);
    assert.equal(result!.getMonth(), 2); // March is 0-indexed
    assert.equal(result!.getDate(), 14);
    assert.equal(result!.getHours(), 18);
    assert.equal(result!.getMinutes(), 30);
  });

  it('is local time, not UTC — the bug that shifts events across a day boundary', () => {
    const result = combineDateAndTime('2026-03-14', '00:30');
    // `new Date('2026-03-14T00:30')` parses inconsistently across engines;
    // building the date explicitly must always land on the 14th locally.
    assert.equal(result!.getDate(), 14);
    assert.equal(result!.getHours(), 0);
  });

  it('rejects malformed input rather than producing Invalid Date', () => {
    assert.equal(combineDateAndTime('14/03/2026', '18:30'), null);
    assert.equal(combineDateAndTime('2026-03-14', '25:00'), null);
    assert.equal(combineDateAndTime('', '18:30'), null);
  });
});

describe('getEventStart', () => {
  it('prefers startsAt over the legacy date/time strings', () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const event = { startsAt: iso(start), date: 'Today', time: '3:00 PM' };
    assert.equal(getEventStart(event)!.getTime(), start.getTime());
  });

  it('parses legacy "7:30 PM" style times when startsAt is absent', () => {
    const event = { date: '2026-05-01', time: '7:30 PM' };
    const start = getEventStart(event);
    assert.ok(start);
    assert.equal(start!.getHours(), 19);
    assert.equal(start!.getMinutes(), 30);
  });

  it('handles 12 AM and 12 PM correctly', () => {
    assert.equal(getEventStart({ date: '2026-05-01', time: '12:00 AM' })!.getHours(), 0);
    assert.equal(getEventStart({ date: '2026-05-01', time: '12:00 PM' })!.getHours(), 12);
  });

  it('returns null for the unparseable seed values that used to reach the feed', () => {
    assert.equal(getEventStart({ date: 'Today', time: '8:00 AM - 9:30 AM' }), null);
    assert.equal(getEventStart({}), null);
  });
});

describe('getEventEnd', () => {
  it('derives the end from duration when endsAt is missing', () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const end = getEventEnd({ startsAt: iso(start), durationMinutes: 90 });
    assert.equal(end!.getTime() - start.getTime(), minutes(90));
  });

  it('falls back to the default duration', () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const end = getEventEnd({ startsAt: iso(start) });
    assert.equal(end!.getTime() - start.getTime(), minutes(DEFAULT_EVENT_DURATION_MINUTES));
  });

  it('prefers an explicit endsAt', () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const explicit = new Date('2026-05-01T23:00:00Z');
    const end = getEventEnd({ startsAt: iso(start), endsAt: iso(explicit), durationMinutes: 30 });
    assert.equal(end!.getTime(), explicit.getTime());
  });
});

describe('hasEventEnded / isUpcoming', () => {
  const now = new Date('2026-05-01T12:00:00Z');

  it('an event still running has not ended', () => {
    // Started an hour ago, runs two hours.
    const event = { startsAt: iso(new Date(now.getTime() - minutes(60))), durationMinutes: 120 };
    assert.equal(hasEventEnded(event, now), false);
    assert.equal(isUpcoming(event, now), true);
  });

  it('an event whose end has passed has ended', () => {
    const event = { startsAt: iso(new Date(now.getTime() - minutes(180))), durationMinutes: 60 };
    assert.equal(hasEventEnded(event, now), true);
    assert.equal(isUpcoming(event, now), false);
  });

  it('rating unlocks exactly at the end boundary, not at the start', () => {
    const event = { startsAt: iso(new Date(now.getTime() - minutes(60))), durationMinutes: 60 };
    assert.equal(hasEventEnded(event, now), true);
  });

  it('an undated event is treated as upcoming so it cannot silently vanish', () => {
    assert.equal(isUpcoming({ date: 'Today' }, now), true);
    assert.equal(hasEventEnded({ date: 'Today' }, now), false);
  });
});

describe('byStartAscending', () => {
  it('orders soonest first and pushes undated events to the end', () => {
    const events = [
      { id: 'later', startsAt: '2026-05-03T10:00:00Z' },
      { id: 'undated' },
      { id: 'sooner', startsAt: '2026-05-01T10:00:00Z' },
    ];
    const ordered = [...events].sort(byStartAscending).map((event) => event.id);
    assert.deepEqual(ordered, ['sooner', 'later', 'undated']);
  });
});

describe('formatEventDate', () => {
  it('falls back to the legacy string rather than showing "Invalid Date"', () => {
    assert.equal(formatEventDate({ date: 'Next Friday' }), 'Next Friday');
    assert.equal(formatEventDate({}), 'Date TBD');
  });
});

describe('formatEventTimeRange', () => {
  it('shows the full span, matching the design intent', () => {
    const start = new Date();
    start.setHours(14, 0, 0, 0);
    const label = formatEventTimeRange({ startsAt: start.toISOString(), durationMinutes: 120 });
    assert.match(label, /2:00/);
    assert.match(label, /4:00/);
    assert.match(label, /-/);
  });

  it('honours the flexible-time flag', () => {
    assert.equal(formatEventTimeRange({ startsAt: new Date().toISOString(), timeFlexible: true }), 'Flexible');
  });

  it('falls back to the legacy string when there is no parseable start', () => {
    assert.equal(formatEventTimeRange({ time: '8:00 AM - 9:30 AM' }), '8:00 AM - 9:30 AM');
    assert.equal(formatEventTimeRange({}), 'Time TBD');
  });
});

describe('formatEventDateLabel', () => {
  const now = new Date('2026-05-13T12:00:00');

  const at = (dayOffset: number) => {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);
    date.setHours(19, 0, 0, 0);
    return { startsAt: date.toISOString() };
  };

  it('uses Today and Tomorrow for the near term', () => {
    assert.equal(formatEventDateLabel(at(0), now), 'Today');
    assert.equal(formatEventDateLabel(at(1), now), 'Tomorrow');
    assert.equal(formatEventDateLabel(at(-1), now), 'Yesterday');
  });

  it('uses a weekday name within the coming week', () => {
    // 2026-05-13 is a Wednesday, so +3 days is Saturday.
    assert.equal(formatEventDateLabel(at(3), now), 'Saturday');
  });

  it('falls back to a calendar date further out', () => {
    const label = formatEventDateLabel(at(30), now);
    assert.doesNotMatch(label, /Today|Tomorrow/);
    assert.match(label, /Jun/);
  });

  it('is based on the calendar day, not a 24-hour window', () => {
    // 11pm tonight is still "Today" even though it is 11 hours away.
    const late = new Date(now);
    late.setHours(23, 0, 0, 0);
    assert.equal(formatEventDateLabel({ startsAt: late.toISOString() }, now), 'Today');
  });
});
