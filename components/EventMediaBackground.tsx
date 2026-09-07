import React, { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Event, EventMedia } from '../lib/types';

/**
 * The full-bleed background of an event card.
 *
 * Organizers could attach videos and they were uploaded and stored, but nothing
 * ever played them — the feed only read `imageUrl`, so a video-only event fell
 * back to a stock photo. This renders whichever the organizer actually chose.
 *
 * Only the card in view plays. Muted and looping, because the feed's own
 * soundtrack owns the audio and a video unmuting itself over it would be a
 * mess.
 */

/** The media an event leads with: its first item, or its imageUrl. */
export const primaryMedia = (event: Event): EventMedia | null => {
  const first = event?.media?.[0];
  if (first?.uri) return first;
  if (event?.imageUrl) return { uri: event.imageUrl, type: 'image' };
  return null;
};

export default function EventMediaBackground({
  event,
  active,
  style,
}: {
  event: Event;
  /** True when this card is the one on screen. */
  active: boolean;
  style?: StyleProp<ViewStyle & ImageStyle>;
}) {
  const media = primaryMedia(event);
  const isVideo = media?.type === 'video';

  const player = useVideoPlayer(isVideo ? media!.uri : null, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    if (!isVideo || !player) return;
    try {
      if (active) player.play();
      else player.pause();
    } catch {
      // Player torn down between renders; nothing to do.
    }
  }, [active, isVideo, player]);

  if (!media) return <View style={[styles.fill, styles.placeholder, style]} />;

  if (isVideo) {
    return (
      <VideoView
        style={[styles.fill, style]}
        player={player}
        contentFit="cover"
        nativeControls={false}
        // The feed is the control surface; the video is scenery.
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    );
  }

  return (
    <Image
      source={{ uri: media.uri }}
      style={[styles.fill, style as StyleProp<ImageStyle>]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: { backgroundColor: '#111827' },
});
