import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { EventMusic } from '../lib/types';

/**
 * Plays the soundtrack attached to the event currently on screen.
 *
 * Headless: the Discover view already owns the track title and the mute
 * control, so this only manages playback and cleanup.
 *
 * Browsers block autoplay with sound until the user interacts with the page,
 * so playback is driven by `muted`. Starting muted and unmuting on tap makes
 * that gesture the thing that unblocks audio, rather than a silent failure.
 */
export default function EventAudioPlayer({
  music,
  muted,
  playing,
}: {
  music?: EventMusic;
  muted: boolean;
  playing: boolean;
}) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const sourceRef = useRef<string | null>(null);

  // Keep playing when the phone's ringer switch is silent — the audio is the
  // point of the feed, not an incidental sound effect.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(
      () => undefined
    );
  }, []);

  useEffect(() => {
    const uri = music?.uri;

    // Swapping to a different track (or to none) tears the old player down.
    if (sourceRef.current !== uri) {
      playerRef.current?.remove();
      playerRef.current = null;
      sourceRef.current = uri ?? null;

      if (uri) {
        try {
          const player = createAudioPlayer({ uri });
          player.loop = true;
          if (music?.startAtSeconds) {
            player.seekTo(music.startAtSeconds).catch(() => undefined);
          }
          playerRef.current = player;
        } catch {
          playerRef.current = null;
        }
      }
    }

    const player = playerRef.current;
    if (!player) return;

    player.muted = muted;

    if (playing && !muted) {
      try {
        player.play();
      } catch {
        // Autoplay refused; the next unmute tap will start it.
      }
    } else {
      try {
        player.pause();
      } catch {
        // Player already torn down.
      }
    }
  }, [music?.uri, music?.startAtSeconds, muted, playing]);

  useEffect(
    () => () => {
      playerRef.current?.remove();
      playerRef.current = null;
    },
    []
  );

  return null;
}

/** Web blocks autoplay with sound, so the feed opens muted there. */
export const shouldStartMuted = Platform.OS === 'web';
