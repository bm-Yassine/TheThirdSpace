import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, G } from 'react-native-svg';
import { angleFor, initialsFor, paletteFor } from '../lib/identity';

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
      <Image
        source={{ uri: photoURL }}
        style={[{ width: size, height: size, borderRadius: radius }, ringStyle]}
      />
    );
  }

  const seed = uid || name || 'anonymous';
  const palette = paletteFor(seed);
  const initials = initialsFor(name);
  const rotation = angleFor(seed);

  // Scales with size so the mark reads the same at 28px and at 96px.
  const markRadius = 26;
  const offset = 15;

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

        {/*
          The mark, ghosted — identity without competing with the initials.
          Uses an SVG transform rather than react-native-svg's rotation/origin
          props, which serialise to an invalid DOM attribute on web.
        */}
        <G opacity={0.26} transform={`rotate(${rotation} 50 50)`}>
          <Circle cx="50" cy={50 - offset} r={markRadius} fill="none" stroke="#fff" strokeWidth="4" />
          <Circle cx={50 - offset} cy={50 + offset * 0.7} r={markRadius} fill="none" stroke="#fff" strokeWidth="4" />
          <Circle cx={50 + offset} cy={50 + offset * 0.7} r={markRadius} fill="none" stroke="#fff" strokeWidth="4" />
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
