import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, ClipPath, G } from 'react-native-svg';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';

/**
 * What someone sees when the feed has nothing in it.
 *
 * This is the first screen of a brand new install and of a brand new city, so
 * it carries the weight of explaining the product. "No events found" said
 * nothing about what the app is for or what to do next.
 *
 * The mark draws itself in — three circles meeting — which is both the logo
 * and the idea: the third space is where people's circles overlap.
 */
export default function EmptyFeed({
  tone = 'dark',
  filtered = false,
  onClearFilters,
}: {
  /** 'dark' for the full-bleed feed, 'light' for screens on white. */
  tone?: 'dark' | 'light';
  /** True when the feed is empty because of filters rather than having no events. */
  filtered?: boolean;
  onClearFilters?: () => void;
}) {
  const { user } = useAuth();
  const enter = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // A slow breath, matching the floating navigation, so the screen feels
    // alive rather than broken.
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [enter, drift]);

  const isDark = tone === 'dark';
  const ink = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : '#6b7280';
  const stroke = isDark ? 'rgba(255,255,255,0.9)' : '#111827';

  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
    drift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })
  );

  const headline = filtered
    ? 'Nothing matches those filters'
    : user
    ? 'Nothing happening yet'
    : 'Find your people';

  const body = filtered
    ? 'Try widening the dates, or clearing a tag.'
    : user
    ? 'Be the one who starts something. Create an event and it appears here for everyone nearby.'
    : 'The Third Space is where you find what is happening around you — and the people doing it.';

  return (
    <View style={[styles.wrap, isDark ? styles.wrapDark : styles.wrapLight]}>
      <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>
        <Svg width={84} height={84} viewBox="0 0 100 100" style={styles.mark}>
          <Defs>
            <ClipPath id="ef1">
              <Circle cx="50" cy="36" r="24" />
            </ClipPath>
            <ClipPath id="ef2">
              <Circle cx="36" cy="60" r="24" />
            </ClipPath>
          </Defs>
          <G fill="none" stroke={stroke} strokeWidth="3.4">
            <Circle cx="50" cy="36" r="24" />
            <Circle cx="36" cy="60" r="24" />
            <Circle cx="64" cy="60" r="24" />
          </G>
          <G clipPath="url(#ef1)">
            <G clipPath="url(#ef2)">
              <Circle cx="64" cy="60" r="24" fill="#6366f1" />
            </G>
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>
        <Text style={[styles.headline, { color: ink }]}>{headline}</Text>
        <Text style={[styles.body, { color: muted }]}>{body}</Text>

        <View style={styles.actions}>
          {filtered ? (
            <Pressable onPress={onClearFilters} style={[styles.primary, isDark && styles.primaryOnDark]}>
              <Text style={[styles.primaryText, isDark && styles.primaryTextOnDark]}>
                Clear filters
              </Text>
            </Pressable>
          ) : user ? (
            <Pressable
              onPress={() => router.push('/create')}
              style={[styles.primary, isDark && styles.primaryOnDark]}
            >
              <Text style={[styles.primaryText, isDark && styles.primaryTextOnDark]}>
                Create an event
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/login')}
              style={[styles.primary, isDark && styles.primaryOnDark]}
            >
              <Text style={[styles.primaryText, isDark && styles.primaryTextOnDark]}>
                Get started
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  wrapDark: { backgroundColor: '#0b0f1a' },
  wrapLight: { backgroundColor: '#ffffff' },

  mark: { alignSelf: 'center', marginBottom: 22 },
  headline: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 10 },

  actions: { alignItems: 'center', marginTop: 22 },
  primary: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  primaryOnDark: { backgroundColor: '#ffffff' },
  primaryText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  primaryTextOnDark: { color: '#111827' },
});
