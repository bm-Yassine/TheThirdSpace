import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../Backend/firebase';
import { isUsable, type LibraryTrack } from './musicLicence';

export * from './musicLicence';

/**
 * The shared, licence-clear music library.
 *
 * Organizers could already upload their own audio, which puts the licensing
 * burden on them and in practice means most events have no soundtrack. This
 * is a curated catalogue they can pick from instead.
 *
 * Tracks live in Firestore rather than in this file so the library can grow
 * without shipping an app update, and the audio lives in the project's own
 * Storage bucket rather than being hotlinked — free-music hosts generally
 * forbid hotlinking, and a dead link would silence a feed.
 *
 * Licence is stored per track and shown wherever the track plays, because
 * CC-BY requires visible attribution and CC0 does not. Getting that wrong is
 * the whole risk this feature carries.
 */

let cache: LibraryTrack[] | null = null;

/** Loads the catalogue, cached for the session — it changes rarely. */
export const loadLibrary = async (options?: { force?: boolean }): Promise<LibraryTrack[]> => {
  if (cache && !options?.force) return cache;

  try {
    const snapshot = await getDocs(collection(db, 'musicTracks'));
    const tracks = snapshot.docs
      .map((snap) => ({ ...(snap.data() as any), id: snap.id }) as LibraryTrack)
      .filter(isUsable)
      .sort((a, b) => a.title.localeCompare(b.title));
    cache = tracks;
    return tracks;
  } catch (error) {
    console.warn('Could not load the music library:', error);
    return cache ?? [];
  }
};

/** Moods that actually have tracks, so the filter never offers an empty one. */
/** Used by the seeding tool; writes are organizer-restricted by the rules. */
export const upsertTrack = async (track: LibraryTrack): Promise<void> => {
  await setDoc(doc(db, 'musicTracks', track.id), track, { merge: true });
  cache = null;
};

export const findTrack = async (id: string): Promise<LibraryTrack | null> => {
  const tracks = await loadLibrary();
  return tracks.find((track) => track.id === id) ?? null;
};

export const searchLibrary = async (text: string): Promise<LibraryTrack[]> => {
  const { searchTracks } = await import('./musicLicence');
  return searchTracks(await loadLibrary(), text);
};
