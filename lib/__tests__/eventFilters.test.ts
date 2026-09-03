import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFilters,
  activeFilterCount,
  collectTags,
  collectTypes,
  emptyFilters,
  isFilterActive,
} from '../eventFilters';
import type { Event } from '../types';

const now = new Date('2026-05-13T12:00:00');

const at = (dayOffset: number) => {
  const date = new Date(now);
  date.setDate(now.getDate() + dayOffset);
  date.setHours(19, 0, 0, 0);
  return date.toISOString();
};

const event = (overrides: Partial<Event>): Event =>
  ({
    id: Math.random().toString(),
    title: 'Untitled',
    organizer: { name: 'Someone' },
    startsAt: at(1),
    cost: 0,
    tags: [],
    ...overrides,
  }) as Event;

const feed: Event[] = [
  event({ id: '1', title: 'Morning Yoga', type: 'Health', tags: ['Health', 'Outdoor'], cost: 0, startsAt: at(0) }),
  event({ id: '2', title: 'Photography Walk', type: 'Arts', tags: ['Art', 'Walking'], cost: 25, startsAt: at(2) }),
  event({ id: '3', title: 'Café Crawl', type: 'Food', tags: ['Food'], cost: 12, startsAt: at(10) }),
  event({ id: '4', title: 'Rooftop Jazz', type: 'Music', tags: ['Music', 'Art'], cost: 80, startsAt: at(40) }),
];

const ids = (list: Event[]) => list.map((e) => String(e.id)).sort();

describe('applyFilters — query', () => {
  it('matches across title, type and tags', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, query: 'yoga' }, now)), ['1']);
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, query: 'music' }, now)), ['4']);
  });

  it('is accent-insensitive, so "cafe" finds "Café"', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, query: 'cafe' }, now)), ['3']);
  });

  it('ANDs multiple terms so extra words narrow the result', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, query: 'rooftop jazz' }, now)), ['4']);
    // "yoga jazz" belongs to no single event.
    assert.deepEqual(applyFilters(feed, { ...emptyFilters, query: 'yoga jazz' }, now), []);
  });

  it('ignores surrounding whitespace', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, query: '   yoga  ' }, now)), ['1']);
  });

  it('an empty query matches everything', () => {
    assert.equal(applyFilters(feed, emptyFilters, now).length, feed.length);
  });
});

describe('applyFilters — price', () => {
  it('free returns only zero-cost events', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, price: 'free' }, now)), ['1']);
  });

  it('bands are inclusive of the boundary', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, price: 'under15' }, now)), ['1', '3']);
    assert.deepEqual(
      ids(applyFilters(feed, { ...emptyFilters, price: 'under50' }, now)),
      ['1', '2', '3']
    );
  });
});

describe('applyFilters — date', () => {
  it('today includes events later the same day', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, date: 'today' }, now)), ['1']);
  });

  it('week and month widen the horizon', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, date: 'week' }, now)), ['1', '2']);
    assert.deepEqual(
      ids(applyFilters(feed, { ...emptyFilters, date: 'month' }, now)),
      ['1', '2', '3']
    );
  });

  it('keeps undated events rather than hiding them on a technicality', () => {
    const undated = [event({ id: 'x', title: 'Someday', startsAt: undefined, date: undefined })];
    assert.equal(applyFilters(undated, { ...emptyFilters, date: 'today' }, now).length, 1);
  });
});

describe('applyFilters — tags and types', () => {
  it('ORs tags, because a chip row reads as "either"', () => {
    assert.deepEqual(
      ids(applyFilters(feed, { ...emptyFilters, tags: ['Music', 'Food'] }, now)),
      ['3', '4']
    );
  });

  it('filters by type', () => {
    assert.deepEqual(ids(applyFilters(feed, { ...emptyFilters, types: ['Arts'] }, now)), ['2']);
  });

  it('combines filter groups with AND', () => {
    const result = applyFilters(
      feed,
      { ...emptyFilters, tags: ['Art'], price: 'under50' },
      now
    );
    // Rooftop Jazz is tagged Art but costs 80, so price excludes it.
    assert.deepEqual(ids(result), ['2']);
  });
});

describe('filter state helpers', () => {
  it('reports whether anything is active', () => {
    assert.equal(isFilterActive(emptyFilters), false);
    assert.equal(isFilterActive({ ...emptyFilters, query: '  ' }), false);
    assert.equal(isFilterActive({ ...emptyFilters, query: 'x' }), true);
    assert.equal(isFilterActive({ ...emptyFilters, price: 'free' }), true);
  });

  it('counts each active group', () => {
    assert.equal(activeFilterCount(emptyFilters), 0);
    assert.equal(
      activeFilterCount({ ...emptyFilters, query: 'x', tags: ['a', 'b'], price: 'free' }),
      4
    );
  });
});

describe('collectTags / collectTypes', () => {
  it('orders tags by frequency', () => {
    assert.equal(collectTags(feed)[0], 'Art');
  });

  it('lists the distinct types', () => {
    assert.deepEqual(collectTypes(feed), ['Arts', 'Food', 'Health', 'Music']);
  });
});
