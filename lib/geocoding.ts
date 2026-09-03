/**
 * Place lookup via OpenStreetMap's Nominatim service.
 *
 * Events created in the app previously stored only a free-text location, with
 * no coordinates — so nothing a user created ever appeared on the map. This
 * turns what someone types into a real place with a latitude and longitude.
 *
 * Nominatim is used rather than Google Places because it needs no API key and
 * no billing account, and the map already renders OSM tiles so the data agrees.
 * Its usage policy asks for a descriptive User-Agent/Referer and at most one
 * request per second, which the debounce in the UI respects.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export type PlaceSuggestion = {
  id: string;
  /** Short label, e.g. "Le Perchoir". */
  name: string;
  /** Full address for disambiguation. */
  address: string;
  latitude: number;
  longitude: number;
};

export type GeoBias = { latitude: number; longitude: number };

const toSuggestion = (entry: any): PlaceSuggestion | null => {
  const latitude = Number(entry?.lat);
  const longitude = Number(entry?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const display: string = entry.display_name || '';
  const name = entry.name?.trim() || display.split(',')[0]?.trim() || 'Unknown place';

  return {
    id: String(entry.place_id ?? `${latitude},${longitude}`),
    name,
    address: display,
    latitude,
    longitude,
  };
};

/**
 * Searches for places matching a query.
 * `bias` nudges results toward a region, so "Le Perchoir" finds the Paris bar
 * rather than a same-named place elsewhere.
 */
export const searchPlaces = async (
  query: string,
  options?: { bias?: GeoBias; limit?: number; signal?: AbortSignal }
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(options?.limit ?? 6),
  });

  if (options?.bias) {
    // A viewbox around the bias point, preferred but not required, so a search
    // can still reach outside the current city.
    const { latitude, longitude } = options.bias;
    const d = 0.5;
    params.set(
      'viewbox',
      `${longitude - d},${latitude + d},${longitude + d},${latitude - d}`
    );
  }

  const response = await fetch(`${NOMINATIM}/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: options?.signal,
  });

  if (!response.ok) throw new Error('Place lookup failed');

  const data = await response.json();
  return (Array.isArray(data) ? data : [])
    .map(toSuggestion)
    .filter(Boolean) as PlaceSuggestion[];
};

/** Turns coordinates back into a readable place name. */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<PlaceSuggestion | null> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
  });

  const response = await fetch(`${NOMINATIM}/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) return null;
  return toSuggestion(await response.json());
};
