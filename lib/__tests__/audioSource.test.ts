import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsAudioProxy, playableAudioUri } from '../audioSource';
import { BUILT_IN_TRACKS } from '../musicCatalogue';

describe('needsAudioProxy', () => {
  it('matches every built-in track', () => {
    // If the catalogue ever grows a URL shape the proxy will not accept, the
    // track would simply fail to play on the web. Catch that here.
    for (const track of BUILT_IN_TRACKS) {
      assert.ok(needsAudioProxy(track.uri), `${track.id} would not be proxied`);
    }
  });

  it('leaves our own Storage uploads alone', () => {
    assert.equal(
      needsAudioProxy('https://firebasestorage.googleapis.com/v0/b/x/o/audio%2Fu%2F1.mp3'),
      false
    );
  });

  it('refuses anything that is not an archive.org track URL', () => {
    for (const uri of [
      'https://evil.example.com/a.mp3',
      // A lookalike host must not slip through.
      'https://archive.org.evil.com/download/x/y.mp3',
      'http://archive.org/download/x/y.mp3',
      'https://archive.org/download/x/y.exe',
      'https://archive.org/details/x',
      // No traversal into another path.
      'https://archive.org/download/../etc/passwd.mp3',
      undefined,
      '',
    ]) {
      assert.equal(needsAudioProxy(uri as string | undefined), false, `allowed: ${uri}`);
    }
  });
});

describe('playableAudioUri', () => {
  const track = BUILT_IN_TRACKS[0].uri;

  it('proxies a library track on the web', () => {
    const result = playableAudioUri(track, true);
    assert.ok(result!.startsWith('/api/audio?src='));
    assert.equal(decodeURIComponent(result!.replace('/api/audio?src=', '')), track);
  });

  it('streams directly on native, which has no CORS to satisfy', () => {
    assert.equal(playableAudioUri(track, false), track);
  });

  it('leaves an uploaded track untouched on both platforms', () => {
    const uploaded = 'https://firebasestorage.googleapis.com/v0/b/x/o/audio%2Fu%2F1.mp3';
    assert.equal(playableAudioUri(uploaded, true), uploaded);
    assert.equal(playableAudioUri(uploaded, false), uploaded);
  });

  it('passes undefined through rather than building a broken URL', () => {
    assert.equal(playableAudioUri(undefined, true), undefined);
  });

  it('encodes the source so a query string cannot be smuggled in', () => {
    const result = playableAudioUri(track, true);
    assert.equal(result!.split('?').length, 2);
  });
});
