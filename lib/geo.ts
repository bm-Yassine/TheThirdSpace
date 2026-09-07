/**
 * Geographic maths.
 *
 * Kept free of React Native and expo-location imports so it can be tested
 * directly — the hook that uses it cannot be, because importing the native
 * location module pulls in the whole React Native runtime.
 */

export type Coords = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in kilometres.
 *
 * Uses the haversine form rather than the spherical law of cosines: the latter
 * loses precision at short distances and can hand `acos` a value marginally
 * above 1 for antipodal points, producing NaN.
 */
export const distanceKm = (a: Coords, b: Coords): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** "450 m" / "2.4 km" / "31 km" — precision that matches the magnitude. */
export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

/** True when the event carries usable coordinates. */
export const hasCoords = (event: any): boolean =>
  typeof event?.latitude === 'number' &&
  typeof event?.longitude === 'number' &&
  Number.isFinite(event.latitude) &&
  Number.isFinite(event.longitude);

/** Distance from a point to an event, or null when the event is unmapped. */
export const distanceToEvent = (from: Coords | null, event: any): number | null => {
  if (!from || !hasCoords(event)) return null;
  return distanceKm(from, { latitude: event.latitude, longitude: event.longitude });
};

/**
 * Sorts events by proximity, keeping unmapped ones at the end rather than
 * dropping them — an event without coordinates is still a real event.
 */
export const byDistanceFrom = (from: Coords | null) => (a: any, b: any) => {
  const da = distanceToEvent(from, a);
  const db = distanceToEvent(from, b);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
};
