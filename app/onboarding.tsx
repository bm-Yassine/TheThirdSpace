import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Circle, ClipPath, Defs, G } from 'react-native-svg';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/taxonomy';
import { useNearby } from '../lib/useNearby';

/**
 * What a new account sees first.
 *
 * The feed is ranked largely on the overlap between someone's interests and an
 * event's tags, but nothing used to ask for those interests — they were only
 * editable later, buried in Profile. So every new user got an unpersonalised
 * feed and no reason to believe the app knew anything about them.
 *
 * Deliberately one screen and skippable. Asking more here costs more people
 * than the extra signal is worth.
 */

const MINIMUM = 3;

export default function OnboardingScreen() {
  const { user, profile, patchProfile } = useAuth();
  const nearby = useNearby();

  const [selected, setSelected] = useState<string[]>(profile?.interests || []);
  const [saving, setSaving] = useState(false);

  const enough = selected.length >= MINIMUM;

  const toggle = (label: string) =>
    setSelected((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );

  const finish = async (interests: string[]) => {
    setSaving(true);
    try {
      if (user) {
        await dataService.updateUserProfile(user.uid, {
          interests,
          // Recorded so the app never asks again, even if they skipped.
          onboardedAt: new Date(),
        } as any);
        patchProfile({ interests });
      }
    } catch (error) {
      console.warn('Could not save interests:', error);
      // Not worth blocking entry over; they can set them in Profile.
    } finally {
      setSaving(false);
      router.replace('/home');
    }
  };

  const columns = useMemo(() => CATEGORIES, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Svg width={64} height={64} viewBox="0 0 100 100" style={styles.mark}>
          <Defs>
            <ClipPath id="ob0"><Circle cx="50" cy="41.8" r="20" /></ClipPath>
            <ClipPath id="ob1"><Circle cx="59.5" cy="58.2" r="20" /></ClipPath>
            <ClipPath id="ob2"><Circle cx="40.5" cy="58.2" r="20" /></ClipPath>
          </Defs>
          <G fill="none" stroke="#ffffff" strokeWidth="4.5">
            <Circle cx="50" cy="41.8" r="20" />
            <Circle cx="59.5" cy="58.2" r="20" />
            <Circle cx="40.5" cy="58.2" r="20" />
          </G>
          <G clipPath="url(#ob0)"><G clipPath="url(#ob1)"><G clipPath="url(#ob2)">
            <Circle cx="50" cy="50" r="50" fill="#6366f1" />
          </G></G></G>
        </Svg>

        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>
          Pick a few and your feed will lean that way. You can change them any time.
        </Text>

        <View style={styles.grid}>
          {columns.map((category) => {
            const isOn = selected.includes(category.label);
            return (
              <Pressable
                key={category.id}
                onPress={() => toggle(category.label)}
                style={[styles.chip, isOn && styles.chipOn]}
              >
                {isOn && <Check size={14} color="#0b0f1a" />}
                <Text style={[styles.chipText, isOn && styles.chipTextOn]}>{category.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/*
          Location is asked for here rather than on the map, because the feed
          itself is sorted by distance — asking at the moment it first matters
          gets a far better acceptance rate than asking on launch.
        */}
        {nearby.status !== 'granted' && (
          <Pressable style={styles.locationCard} onPress={nearby.request}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Show me what&apos;s nearby</Text>
              <Text style={styles.locationBody}>
                {nearby.status === 'denied' || nearby.status === 'unavailable'
                  ? 'Location is blocked. Events will still show, just not sorted by distance.'
                  : 'Lets the feed put the closest events first. Nothing is stored or shared.'}
              </Text>
            </View>
            {nearby.status === 'requesting' ? (
              <ActivityIndicator size="small" color="#a5b4fc" />
            ) : (
              <Text style={styles.locationAction}>Allow</Text>
            )}
          </Pressable>
        )}

        {nearby.status === 'granted' && (
          <View style={[styles.locationCard, styles.locationDone]}>
            <Check size={16} color="#86efac" />
            <Text style={styles.locationDoneText}>Using your location to sort by distance</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => finish(selected)}
          disabled={!enough || saving}
          style={[styles.primary, (!enough || saving) && styles.primaryOff]}
        >
          {saving ? (
            <ActivityIndicator color="#0b0f1a" />
          ) : (
            <Text style={styles.primaryText}>
              {enough ? 'Start exploring' : `Pick ${MINIMUM - selected.length} more`}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => finish(selected)} disabled={saving} style={styles.skip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0f1a' },
  content: { paddingHorizontal: 26, paddingTop: 72, paddingBottom: 24, alignItems: 'center' },

  mark: { marginBottom: 22 },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  subtitle: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 26,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },
  chipTextOn: { color: '#0b0f1a' },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  locationDone: { borderColor: 'rgba(134,239,172,0.3)', backgroundColor: 'rgba(134,239,172,0.08)' },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  locationBody: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 18 },
  locationAction: { fontSize: 13.5, fontWeight: '700', color: '#a5b4fc' },
  locationDoneText: { fontSize: 13, fontWeight: '600', color: '#86efac', flex: 1 },

  footer: { paddingHorizontal: 26, paddingBottom: 34, paddingTop: 8 },
  primary: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryOff: { opacity: 0.35 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#0b0f1a' },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 13.5, color: 'rgba(255,255,255,0.56)', fontWeight: '600' },
});
