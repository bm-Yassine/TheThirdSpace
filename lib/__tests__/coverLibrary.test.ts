import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COVERS,
  coverUrl,
  coversFor,
  findCover,
  isLibraryCover,
  searchCovers,
  suggestCover,
} from '../coverLibrary';
import { CATEGORIES } from '../taxonomy';

describe('the catalogue', () => {
  it('has no duplicate photos', () => {
    const ids = COVERS.map((cover) => cover.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('only uses categories the taxonomy knows about', () => {
    const known = new Set(CATEGORIES.map((category) => category.id));
    for (const cover of COVERS) {
      assert.ok(known.has(cover.category), `unknown category: ${cover.category}`);
    }
  });

  it('covers every category, so no event type falls back to another', () => {
    for (const category of CATEGORIES) {
      assert.ok(
        COVERS.some((cover) => cover.category === category.id),
        `no covers for ${category.label}`
      );
    }
  });

  it('gives every cover a human label', () => {
    for (const cover of COVERS) {
      assert.ok(cover.label.trim().length > 3, `weak label: ${cover.id}`);
    }
  });
});

describe('coverUrl', () => {
  it('asks the CDN for the size being displayed', () => {
    const cover = COVERS[0];
    assert.match(coverUrl(cover, 'thumb'), /w=240&h=160/);
    assert.match(coverUrl(cover, 'full'), /w=1200&h=630/);
    assert.match(coverUrl(cover, 'card'), /w=800&h=1000/);
  });

  it('defaults to the card size', () => {
    assert.equal(coverUrl(COVERS[0]), coverUrl(COVERS[0], 'card'));
  });

  it('builds an absolute https URL containing the photo id', () => {
    const url = coverUrl(COVERS[0], 'full');
    assert.ok(url.startsWith('https://images.unsplash.com/'));
    assert.ok(url.includes(COVERS[0].id));
  });
});

describe('isLibraryCover', () => {
  it('recognises its own URLs at any size', () => {
    assert.ok(isLibraryCover(coverUrl(COVERS[0], 'thumb')));
    assert.ok(isLibraryCover(coverUrl(COVERS[0], 'full')));
  });

  it('rejects an uploaded photo', () => {
    assert.equal(isLibraryCover('https://firebasestorage.googleapis.com/v0/b/x/o/pic.jpg'), false);
    assert.equal(isLibraryCover(undefined), false);
  });

  it('rejects an Unsplash photo that is not in the catalogue', () => {
    assert.equal(isLibraryCover('https://images.unsplash.com/photo-0000000000000-ffffffff'), false);
  });
});

describe('coversFor', () => {
  it('filters to one category', () => {
    const music = coversFor('music');
    assert.ok(music.length > 0);
    assert.ok(music.every((cover) => cover.category === 'music'));
  });

  it('returns everything when no category is given', () => {
    assert.equal(coversFor(null).length, COVERS.length);
  });
});

describe('searchCovers', () => {
  it('matches on the label', () => {
    assert.ok(searchCovers('yoga').some((cover) => cover.label.includes('Yoga')));
  });

  it('matches on the category', () => {
    assert.ok(searchCovers('music').every((cover) => /music/i.test(cover.category + cover.label)));
  });

  it('ignores case and surrounding space', () => {
    assert.deepEqual(searchCovers('  YOGA '), searchCovers('yoga'));
  });

  it('returns the whole catalogue for an empty search', () => {
    assert.equal(searchCovers('').length, COVERS.length);
  });
});

describe('suggestCover', () => {
  it('picks from the event category', () => {
    const cover = suggestCover({ categoryId: 'food', seed: 'Supper club' });
    assert.equal(cover.category, 'food');
  });

  it('is stable for the same event', () => {
    const once = suggestCover({ categoryId: 'food', seed: 'Supper club' });
    const twice = suggestCover({ categoryId: 'food', seed: 'Supper club' });
    assert.equal(once.id, twice.id);
  });

  it('varies between events, so a category is not one repeated picture', () => {
    const seeds = ['Supper club', 'Pasta night', 'Wine tasting', 'Brunch', 'Coffee morning'];
    const picked = new Set(seeds.map((seed) => suggestCover({ categoryId: 'food', seed }).id));
    assert.ok(picked.size > 1, 'every food event got the same cover');
  });

  it('still returns something for an unknown or missing category', () => {
    assert.ok(suggestCover({ categoryId: 'nonsense', seed: 'x' }).id);
    assert.ok(suggestCover({ categoryId: null, seed: 'x' }).id);
    assert.ok(suggestCover({}).id);
  });
});

describe('findCover', () => {
  it('finds by id, and reports a miss', () => {
    assert.equal(findCover(COVERS[0].id)?.id, COVERS[0].id);
    assert.equal(findCover('nope'), undefined);
  });
});
