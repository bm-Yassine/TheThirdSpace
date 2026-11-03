/**
 * Licence and catalogue rules for the music library.
 *
 * Free of Firebase imports so it can be tested directly — importing the
 * Firestore client pulls in the whole React Native runtime. This is also the
 * riskiest part of the feature: getting attribution wrong breaches a licence,
 * so it is the part that most deserves tests.
 */

export type TrackLicence = 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'PUBLIC_DOMAIN' | 'LICENSED';

export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  /** Storage download URL. */
  uri: string;
  durationSeconds?: number;
  mood: string;
  genre?: string;
  licence: TrackLicence;
  /** Required for CC-BY and CC-BY-SA; displayed wherever the track plays. */
  attribution?: string;
  sourceUrl?: string;
};

/**
 * Mood, not genre, is the primary axis: an organizer picking a soundtrack is
 * choosing how the event should feel, not what instruments are on it.
 */
export const MOODS = [
  'Upbeat',
  'Chill',
  'Warm',
  'Energetic',
  'Dreamy',
  'Focused',
  'Playful',
] as const;

const ATTRIBUTION_REQUIRED: TrackLicence[] = ['CC-BY', 'CC-BY-SA'];

export const requiresAttribution = (licence: TrackLicence) =>
  ATTRIBUTION_REQUIRED.includes(licence);

/**
 * The credit to display, or null when none is owed.
 *
 * Falls back to building one from the title and artist when a track that
 * needs attribution has no explicit credit: showing an imperfect credit is a
 * far better failure than silently showing none, which would breach the
 * licence.
 */
export const creditLine = (
  track: Pick<LibraryTrack, 'licence' | 'attribution' | 'artist' | 'title'>
): string | null => {
  if (!requiresAttribution(track.licence)) return null;
  return track.attribution?.trim() || `${track.title} by ${track.artist} (${track.licence})`;
};

/** A track is usable only with audio and a licence we can actually honour. */
export const isUsable = (track: Partial<LibraryTrack>): boolean =>
  !!track.uri &&
  !!track.title &&
  !!track.licence &&
  (!requiresAttribution(track.licence) || !!track.attribution?.trim() || !!track.artist?.trim());

export const byMood = (tracks: LibraryTrack[], mood: string | null) =>
  mood ? tracks.filter((track) => track.mood === mood) : tracks;

/** Only moods that actually have tracks, so the filter never offers an empty one. */
export const availableMoods = (tracks: LibraryTrack[]): string[] =>
  MOODS.filter((mood) => tracks.some((track) => track.mood === mood));

export const searchTracks = (tracks: LibraryTrack[], text: string): LibraryTrack[] => {
  const needle = text.trim().toLowerCase();
  if (!needle) return tracks;
  return tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(needle) ||
      track.artist.toLowerCase().includes(needle) ||
      (track.genre || '').toLowerCase().includes(needle)
  );
};

export const sortByTitle = (tracks: LibraryTrack[]): LibraryTrack[] =>
  [...tracks].sort((a, b) => a.title.localeCompare(b.title));

/**
 * Combines the built-in catalogue with whatever Firestore holds.
 *
 * Firestore wins on a clash of ids, so a built-in track can be corrected — or
 * swapped for a copy mirrored into our own Storage — without a release.
 */
export const mergeTracks = (
  builtIn: LibraryTrack[],
  seeded: LibraryTrack[]
): LibraryTrack[] => {
  const byId = new Map(builtIn.map((track) => [track.id, track]));
  for (const track of seeded) byId.set(track.id, track);
  return sortByTitle([...byId.values()]);
};
