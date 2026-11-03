/**
 * Where a track's audio is actually fetched from.
 *
 * Built-in library tracks live on the Internet Archive, which does not send
 * `Access-Control-Allow-Origin` from every storage node it might serve a file
 * from. On the web `expo-audio` uses the Web Audio API, which requires CORS,
 * so an Archive-hosted track plays or is silently blocked depending on which
 * node the request happened to reach. Routing those through api/audio makes it
 * deterministic.
 *
 * Nothing else is rewritten: an organizer's own upload already comes from our
 * Storage bucket with CORS configured, and native playback is not subject to
 * CORS at all.
 *
 * Kept free of React Native imports so the rewriting rule can be tested.
 */

const ARCHIVE_TRACK =
  /^https:\/\/archive\.org\/download\/[A-Za-z0-9._%-]+\/[A-Za-z0-9._%()'\- ]+\.mp3$/;

/** True when this URL needs the proxy to be playable in a browser. */
export const needsAudioProxy = (uri: string | undefined): boolean =>
  !!uri && ARCHIVE_TRACK.test(uri);

/**
 * The URL to hand the player.
 *
 * `isWeb` is passed in rather than read from Platform so this stays testable
 * and so the caller decides — native streams the Archive directly and should
 * not spend our bandwidth on the proxy.
 */
export const playableAudioUri = (
  uri: string | undefined,
  isWeb: boolean
): string | undefined => {
  if (!uri) return undefined;
  if (!isWeb || !needsAudioProxy(uri)) return uri;
  return `/api/audio?src=${encodeURIComponent(uri)}`;
};
