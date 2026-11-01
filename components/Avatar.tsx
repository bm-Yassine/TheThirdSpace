import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, G } from 'react-native-svg';
import { initialsFor, paletteFor } from '../lib/identity';

/**
 * A person, rendered consistently everywhere they appear.
 *
 * Order of preference:
 *   1. the photo they uploaded
 *   2. a generated avatar derived from their uid — a brand-palette gradient,
 *      the three-circle mark ghosted behind, and their initials
 *
 * The mark behind the initials is what ties an avatar to the app's identity,
 * rather than looking like a generic initials bubble.
 */
export default function Avatar({
  uid,
  name,
  photoURL,
  size = 44,
  ring = false,
}: {
  uid?: string | null;
  name?: string | null;
  photoURL?: string | null;
  size?: number;
  /** A subtle light ring, for placing avatars on photography. */
  ring?: boolean;
}) {
  const radius = size / 2;
  const ringStyle = ring
    ? { borderWidth: Math.max(1.5, size * 0.045), borderColor: 'rgba(255,255,255,0.9)' }
    : null;

  if (photoURL) {
    return (
      // Wrapped and clipped rather than relying on borderRadius on the image:
      // react-native-web renders Image as an <img> whose default object-fit is
      // `fill`, which stretches a portrait photo into the square instead of
      // cropping it, and does not always honour the radius.
      <View
        style={[
          { width: size, height: size, borderRadius: radius, overflow: 'hidden' },
          ringStyle,
        ]}
      >
        <Image
          source={{ uri: photoURL }}
          // Set on both the prop and the style: react-native-web has mapped
          // resizeMode from each across different versions, and the default
          // (`fill`) stretches a portrait photo rather than cropping it.
          resizeMode="cover"
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </View>
    );
  }

  const seed = uid || name || 'anonymous';
  const palette = paletteFor(seed);
  const initials = initialsFor(name);

  /**
   * The mark, matching the app icon exactly so the brand does not drift
   * between the icon and the avatars: three circles on an equilateral
   * arrangement (r 20, d 10.9 about a centre at y 52.7 in a 100 viewBox),
   * which places the bounding box dead centre in the tile.
   *
   * Rings only here — the icon fills the shared middle, but behind initials
   * that fill would fight the letters.
   */
  const MARK_RADIUS = 20;
  const markCentres = [-90, 30, 150].map((degrees) => {
    const radians = (degrees * Math.PI) / 180;
    return {
      cx: 50 + 10.9 * Math.cos(radians),
      cy: 52.7 + 10.9 * Math.sin(radians),
    };
  });

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, ringStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`g-${seed}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={palette.from} />
            <Stop offset="100%" stopColor={palette.to} />
          </LinearGradient>
        </Defs>

        <Rect width="100" height="100" fill={`url(#g-${seed})`} />

        {/* The mark, ghosted — identity without competing with the initials. */}
        <G opacity={0.24}>
          {markCentres.map((circle, index) => (
            <Circle
              key={index}
              cx={circle.cx}
              cy={circle.cy}
              r={MARK_RADIUS}
              fill="none"
              stroke="#fff"
              strokeWidth="4.5"
            />
          ))}
        </G>
      </Svg>

      <View style={styles.initialsLayer} pointerEvents="none">
        <Text
          style={[
            styles.initials,
            { color: palette.ink, fontSize: size * 0.38, lineHeight: size * 0.46 },
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
});
