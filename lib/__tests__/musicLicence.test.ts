import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableMoods,
  byMood,
  creditLine,
  isUsable,
  MOODS,
  requiresAttribution,
  type LibraryTrack,
} from '../musicLicence';

const track = (over: Partial<LibraryTrack> = {}): LibraryTrack =>
  ({
    id: 't1',
    title: 'Slow Morning',
    artist: 'Someone',
    uri: 'https://example.test/a.mp3',
    mood: 'Chill',
    licence: 'CC0',
    ...over,
  }) as LibraryTrack;

describe('requiresAttribution', () => {
  it('is true for the CC-BY family and false otherwise', () => {
    assert.equal(requiresAttribution('CC-BY'), true);
    assert.equal(requiresAttribution('CC-BY-SA'), true);
    assert.equal(requiresAttribution('CC0'), false);
    assert.equal(requiresAttribution('PUBLIC_DOMAIN'), false);
  });
});

describe('creditLine', () => {
  it('returns nothing when no credit is owed', () => {
    assert.equal(creditLine(track({ licence: 'CC0' })), null);
  });

  it('uses the explicit attribution when present', () => {
    const line = creditLine(track({ licence: 'CC-BY', attribution: 'Nocturne by Kai (CC-BY 4.0)' }));
    assert.equal(line, 'Nocturne by Kai (CC-BY 4.0)');
  });

  it('degrades to a built credit rather than no credit when the field is missing', () => {
    // Silently showing nothing would breach the licence; an imperfect credit
    // is the safer failure.
    const line = creditLine(track({ licence: 'CC-BY', attribution: undefined }));
    assert.ok(line && line.includes('Slow Morning') && line.includes('Someone'));
  });

  it('ignores a blank attribution string', () => {
    const line = creditLine(track({ licence: 'CC-BY', attribution: '   ' }));
    assert.ok(line && line.includes('Someone'));
  });
});

describe('isUsable', () => {
  it('accepts a complete CC0 track', () => {
    assert.equal(isUsable(track()), true);
  });

  it('rejects a track with no audio', () => {
    assert.equal(isUsable(track({ uri: '' })), false);
  });

  it('rejects a track with no licence', () => {
    assert.equal(isUsable({ ...track(), licence: undefined as any }), false);
  });

  it('accepts CC-BY only when a credit can be produced', () => {
    assert.equal(isUsable(track({ licence: 'CC-BY', attribution: 'credit' })), true);
    assert.equal(isUsable(track({ licence: 'CC-BY', attribution: undefined, artist: 'Someone' })), true);
    assert.equal(
      isUsable({ ...track(), licence: 'CC-BY', attribution: undefined, artist: '' }),
      false
    );
  });
});

describe('byMood / availableMoods', () => {
  const tracks = [track({ id: 'a', mood: 'Chill' }), track({ id: 'b', mood: 'Upbeat' })];

  it('filters to one mood', () => {
    assert.deepEqual(byMood(tracks, 'Chill').map((t) => t.id), ['a']);
  });

  it('returns everything when no mood is chosen', () => {
    assert.equal(byMood(tracks, null).length, 2);
  });

  it('only offers moods that have tracks', () => {
    const moods = availableMoods(tracks);
    assert.deepEqual(moods.sort(), ['Chill', 'Upbeat']);
    assert.ok(moods.length < MOODS.length, 'empty moods should not be offered');
  });

  it('offers nothing for an empty library', () => {
    assert.deepEqual(availableMoods([]), []);
  });
});
