import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { byDistanceFrom, distanceKm, distanceToEvent, formatDistance, hasCoords } from '../geo';

// Reference points with well-known separations.
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LOUVRE = { latitude: 48.8606, longitude: 2.3376 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    assert.equal(distanceKm(PARIS, PARIS), 0);
  });

  it('matches the known Paris–London distance (~344 km)', () => {
    const d = distanceKm(PARIS, LONDON);
    assert.ok(Math.abs(d - 344) < 5, `expected ~344 km, got ${d.toFixed(1)}`);
  });

  it('matches the known Paris–New York distance (~5837 km)', () => {
    const d = distanceKm(PARIS, NEW_YORK);
    assert.ok(Math.abs(d - 5837) < 30, `expected ~5837 km, got ${d.toFixed(1)}`);
  });

  it('handles short in-city distances (Châtelet to the Louvre, ~1.2 km)', () => {
    const d = distanceKm(PARIS, LOUVRE);
    assert.ok(d > 0.8 && d < 1.6, `expected ~1.2 km, got ${d.toFixed(2)}`);
  });

  it('is symmetric', () => {
    assert.equal(
      distanceKm(PARIS, LONDON).toFixed(6),
      distanceKm(LONDON, PARIS).toFixed(6)
    );
  });

  it('does not produce NaN for antipodal points', () => {
    // The naive acos form of the haversine can exceed 1 and yield NaN here.
    const d = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 });
    assert.ok(Number.isFinite(d), 'distance should be finite');
    assert.ok(Math.abs(d - 20015) < 50, `expected ~20015 km, got ${d.toFixed(1)}`);
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    assert.equal(formatDistance(0.45), '450 m');
    assert.equal(formatDistance(0.999), '999 m');
  });

  it('uses one decimal in the near range', () => {
    assert.equal(formatDistance(2.44), '2.4 km');
  });

  it('drops the decimal once precision stops mattering', () => {
    assert.equal(formatDistance(31.4), '31 km');
  });
});

describe('hasCoords', () => {
  it('accepts real coordinates and rejects everything else', () => {
    assert.equal(hasCoords({ latitude: 48.85, longitude: 2.35 }), true);
    assert.equal(hasCoords({ latitude: 48.85 }), false);
    assert.equal(hasCoords({ latitude: NaN, longitude: 2.35 }), false);
    assert.equal(hasCoords({ latitude: '48.85', longitude: '2.35' }), false);
    assert.equal(hasCoords({}), false);
  });

  it('treats the equator and prime meridian as valid, not falsy', () => {
    assert.equal(hasCoords({ latitude: 0, longitude: 0 }), true);
  });
});

describe('distanceToEvent', () => {
  it('is null without a viewer location or without event coordinates', () => {
    assert.equal(distanceToEvent(null, { latitude: 48.85, longitude: 2.35 }), null);
    assert.equal(distanceToEvent(PARIS, { location: 'somewhere' }), null);
  });
});

describe('byDistanceFrom', () => {
  const near = { id: 'near', latitude: 48.8606, longitude: 2.3376 };
  const far = { id: 'far', latitude: 51.5074, longitude: -0.1278 };
  const unmapped = { id: 'unmapped' };

  it('orders nearest first', () => {
    const sorted = [far, near].sort(byDistanceFrom(PARIS)).map((e) => e.id);
    assert.deepEqual(sorted, ['near', 'far']);
  });

  it('keeps unmapped events last rather than dropping them', () => {
    const sorted = [unmapped, far, near].sort(byDistanceFrom(PARIS)).map((e) => e.id);
    assert.deepEqual(sorted, ['near', 'far', 'unmapped']);
  });

  it('leaves order untouched when the viewer location is unknown', () => {
    const sorted = [far, near, unmapped].sort(byDistanceFrom(null)).map((e) => e.id);
    assert.deepEqual(sorted, ['far', 'near', 'unmapped']);
  });
});
