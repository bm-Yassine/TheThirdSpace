import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BUILT_IN_TRACKS } from '../musicCatalogue';
import {
  MOODS,
  creditLine,
  isUsable,
  mergeTracks,
  requiresAttribution,
  type LibraryTrack,
} from '../musicLicence';

describe('the built-in catalogue', () => {
  it('is not empty — an empty picker is why this exists', () => {
    assert.ok(BUILT_IN_TRACKS.length >= 10);
  });

  it('gives every track a unique id', () => {
    const ids = BUILT_IN_TRACKS.map((track) => track.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('only uses licences that permit commercial use', () => {
    // The app takes payments, so a NonCommercial track would not be covered.
    for (const track of BUILT_IN_TRACKS) {
      assert.ok(
        ['CC0', 'CC-BY', 'PUBLIC_DOMAIN'].includes(track.licence),
        `${track.id} has licence ${track.licence}`
      );
    }
  });

  it('credits every track that needs crediting', () => {
    for (const track of BUILT_IN_TRACKS) {
      if (!requiresAttribution(track.licence)) continue;
      assert.ok(track.attribution?.trim(), `${track.id} needs an attribution`);
      // The credit must actually name the creator, or it credits nobody.
      assert.ok(
        track.attribution!.includes(track.artist),
        `${track.id} does not name its artist`
      );
    }
  });

  it('owes no credit on CC0 and public domain', () => {
    for (const track of BUILT_IN_TRACKS) {
      if (requiresAttribution(track.licence)) continue;
      assert.equal(creditLine(track), null, `${track.id} should owe no credit`);
    }
  });

  it('passes the library usability check', () => {
    for (const track of BUILT_IN_TRACKS) {
      assert.ok(isUsable(track), `${track.id} would be filtered out`);
    }
  });

  it('names a source for every track, so a claim can be checked', () => {
    for (const track of BUILT_IN_TRACKS) {
      assert.match(track.sourceUrl ?? '', /^https:\/\/archive\.org\/details\//, track.id);
    }
  });

  it('serves audio over https', () => {
    for (const track of BUILT_IN_TRACKS) {
      assert.match(track.uri, /^https:\/\//, track.id);
      assert.match(track.uri, /\.mp3$/i, track.id);
    }
  });

  it('only uses moods the picker offers', () => {
    for (const track of BUILT_IN_TRACKS) {
      assert.ok(
        (MOODS as readonly string[]).includes(track.mood),
        `${track.id} has mood ${track.mood}`
      );
    }
  });

  it('covers every mood, so no filter comes back empty', () => {
    for (const mood of MOODS) {
      assert.ok(
        BUILT_IN_TRACKS.some((track) => track.mood === mood),
        `no track for ${mood}`
      );
    }
  });

  it('holds tracks of a usable length', () => {
    for (const track of BUILT_IN_TRACKS) {
      // Short enough to loop without being a jingle, long enough not to.
      assert.ok(
        track.durationSeconds! >= 90 && track.durationSeconds! <= 420,
        `${track.id} is ${track.durationSeconds}s`
      );
    }
  });

  it('does not repeat an artist', () => {
    const artists = BUILT_IN_TRACKS.map((track) => track.artist.toLowerCase());
    assert.equal(new Set(artists).size, artists.length);
  });

  it('names a real artist on every track', () => {
    for (const track of BUILT_IN_TRACKS) {
      assert.ok(track.artist.trim().length > 1, track.id);
      assert.doesNotMatch(track.artist, /^(unknown|various artists|n\/a)$/i, track.id);
    }
  });
});

describe('mergeTracks', () => {
  const track = (id: string, title: string): LibraryTrack => ({
    id,
    title,
    artist: 'Someone',
    uri: `https://example.com/${id}.mp3`,
    mood: 'Chill',
    licence: 'CC0',
  });

  it('returns the built-ins when Firestore holds nothing', () => {
    const merged = mergeTracks([track('a', 'Alpha')], []);
    assert.deepEqual(merged.map((item) => item.id), ['a']);
  });

  it('adds seeded tracks alongside the built-ins', () => {
    const merged = mergeTracks([track('a', 'Alpha')], [track('b', 'Beta')]);
    assert.deepEqual(merged.map((item) => item.id), ['a', 'b']);
  });

  it('lets a seeded track override a built-in of the same id', () => {
    // This is how a built-in gets corrected, or repointed at our own bucket,
    // without shipping a release.
    const merged = mergeTracks(
      [track('a', 'Alpha')],
      [{ ...track('a', 'Alpha'), uri: 'https://storage.example.com/mirrored.mp3' }]
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].uri, 'https://storage.example.com/mirrored.mp3');
  });

  it('sorts by title, so the picker has a stable order', () => {
    const merged = mergeTracks(
      [track('c', 'Zebra'), track('a', 'Apple')],
      [track('b', 'Mango')]
    );
    assert.deepEqual(merged.map((item) => item.title), ['Apple', 'Mango', 'Zebra']);
  });
});
