import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_MAP_CENTER } from './config';
import type { Coords } from './geo';

/**
 * The viewer's location, for centring the map and sorting by distance.
 *
 * Permission is requested only when something actually needs the location —
 * opening the map or tapping "Near me" — never on app start. An app that asks
 * for location before showing anything is one people decline out of hand.
 *
 * Every failure path degrades to the default centre rather than blocking.
 */

export type { Coords };

export type NearbyState = {
  coords: Coords | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  /** Where the map should open: the viewer if known, otherwise the fallback. */
  center: Coords;
  request: () => Promise<void>;
};

export function useNearby(fallback: Coords = DEFAULT_MAP_CENTER): NearbyState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<NearbyState['status']>('idle');

  const request = useCallback(async () => {
    setStatus('requesting');
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      // Balanced accuracy is plenty for "what is near me" and is markedly
      // faster and cheaper than the high-accuracy fix.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setStatus('granted');
    } catch {
      // Location services off, browser blocked it, or the fix timed out.
      setStatus('unavailable');
    }
  }, []);

  // If permission was already granted in a previous session, use it without
  // prompting again.
  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then(({ status: permission }) => {
        if (active && permission === 'granted') request();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [request]);

  return { coords, status, center: coords ?? fallback, request };
}
