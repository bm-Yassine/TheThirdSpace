import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_TAGS,
  CATEGORIES,
  categoryByLabel,
  expandInterests,
  suggestTags,
} from '../taxonomy';

describe('taxonomy shape', () => {
  it('has unique category ids and labels', () => {
    assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
    assert.equal(new Set(CATEGORIES.map((c) => c.label)).size, CATEGORIES.length);
  });

  it('exposes every label and related tag, deduplicated', () => {
    assert.equal(new Set(ALL_TAGS).size, ALL_TAGS.length);
    CATEGORIES.forEach((c) => assert.ok(ALL_TAGS.includes(c.label), `${c.label} missing`));
  });

  it('looks a category up case-insensitively', () => {
    assert.equal(categoryByLabel('music')?.id, 'music');
    assert.equal(categoryByLabel('  MUSIC  ')?.id, 'music');
    assert.equal(categoryByLabel('nonsense'), undefined);
    assert.equal(categoryByLabel(null), undefined);
  });
});

describe('suggestTags', () => {
  it('leads with the chosen type', () => {
    const tags = suggestTags({ type: 'Music' });
    assert.equal(tags[0], 'Music');
  });

  it('picks up words written in the title', () => {
    const tags = suggestTags({ title: 'Sunrise Yoga in the park' });
    assert.ok(tags.includes('Yoga'), `expected Yoga in ${tags.join(', ')}`);
    assert.ok(tags.includes('Park'), `expected Park in ${tags.join(', ')}`);
  });

  it('matches on word boundaries, so "art" does not fire on "party"', () => {
    const tags = suggestTags({ title: 'Rooftop party' });
    assert.ok(!tags.includes('Art'), `"Art" should not match "party": ${tags.join(', ')}`);
  });

  it('is case-insensitive about what the organizer typed', () => {
    assert.ok(suggestTags({ title: 'LIVE MUSIC all night' }).includes('Live Music'));
  });

  it('combines the type and the text, ranking explicit mentions highly', () => {
    const tags = suggestTags({ type: 'Food & Drink', title: 'Natural wine tasting' });
    assert.ok(tags.includes('Wine'));
    assert.ok(tags.includes('Food & Drink'));
  });

  it('respects the limit', () => {
    assert.ok(suggestTags({ type: 'Music', limit: 3 }).length <= 3);
  });

  it('returns nothing rather than throwing on empty input', () => {
    assert.deepEqual(suggestTags({}), []);
  });

  it('never suggests the same tag twice', () => {
    const tags = suggestTags({ type: 'Music', title: 'Live Music and more live music' });
    assert.equal(new Set(tags).size, tags.length);
  });
});

describe('expandInterests', () => {
  it('widens an interest to the tags it implies', () => {
    const expanded = expandInterests(['Music']);
    assert.ok(expanded.includes('Music'));
    assert.ok(expanded.includes('Live Music'), 'a Music fan should match a Live Music event');
  });

  it('keeps an unknown interest rather than dropping it', () => {
    assert.ok(expandInterests(['Birdwatching']).includes('Birdwatching'));
  });

  it('deduplicates across overlapping categories', () => {
    // Yoga appears under both Sports and Health & Wellness.
    const expanded = expandInterests(['Sports', 'Health & Wellness']);
    assert.equal(expanded.filter((t) => t === 'Yoga').length, 1);
  });

  it('handles an empty profile', () => {
    assert.deepEqual(expandInterests([]), []);
  });
});
