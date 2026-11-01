import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationValue } from '../components/LocationField';

/**
 * What an organizer used last time.
 *
 * Someone who runs a weekly thing was re-entering the same venue, capacity and
 * price on every event. These are remembered on the device rather than the
 * profile: they are a convenience, not data worth syncing or storing about a
 * person, and a stale value should never outlive the device it came from.
 */

const KEY = 'thirdspace.lastEventDefaults.v1';

export type EventDefaults = {
  type?: string;
  location?: LocationValue;
  minPeople?: string;
  maxPeople?: string;
  cost?: string;
  openToAll?: boolean;
  durationMinutes?: number;
};

export const loadEventDefaults = async (): Promise<EventDefaults | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EventDefaults) : null;
  } catch {
    // A corrupt or unavailable store must never block event creation.
    return null;
  }
};

export const saveEventDefaults = async (defaults: EventDefaults): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(defaults));
  } catch {
    // Best effort only.
  }
};

export const clearEventDefaults = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Best effort only.
  }
};
