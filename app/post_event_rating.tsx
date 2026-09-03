import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Star, CheckCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { hasEventEnded } from '../lib/eventTime';
import type { Attendee } from '../lib/types';
import { qualitiesFor, type Quality } from '../lib/ratingQualities';
import Avatar from '../components/Avatar';

type Person = {
  uid: string;
  name: string;
  photoURL?: string | null;
  role: 'organizer' | 'attendee';
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function PostEventRatingScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');
  const { user, initializing } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<any | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<
    Record<string, { quality: Quality; stars: number }>
  >({});
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId || !user) {
      setLoading(false);
      return;
    }

    try {
      const eventData: any = await dataService.getEvent(eventId);
      if (!eventData) {
        setError('This event could not be found.');
        return;
      }
      setEvent(eventData);

      if (!hasEventEnded(eventData)) {
        setError('You can rate people once the event has finished.');
        return;
      }

      if (await dataService.hasRatedEvent(eventId)) {
        setError('You have already rated this event. Thanks!');
        return;
      }

      const isOrganizer = eventData.createdBy === user.uid;

      if (isOrganizer) {
        // Organizers rate everyone who actually showed up.
        const confirmed: Attendee[] = await dataService.getEventParticipants(eventId, 'confirmed');
        const rateable = confirmed.filter((attendee) => attendee.uid !== user.uid);
        if (rateable.length === 0) {
          setError('Nobody attended this event, so there is nobody to rate.');
          return;
        }
        setPeople(
          rateable.map((attendee) => ({
            uid: attendee.uid,
            name: attendee.name,
            photoURL: attendee.photoURL,
            role: 'attendee' as const,
          }))
        );
        return;
      }

      // Attendees rate the organizer, but only if they actually attended.
      const commitment = await dataService.getUserCommitment(eventId);
      if (commitment?.status !== 'confirmed') {
        setError('Only confirmed attendees can rate this event.');
        return;
      }

      const organizerUid = eventData.createdBy || eventData.organizer?.uid;
      if (!organizerUid) {
        setError('This event has no organizer profile to rate.');
        return;
      }

      setPeople([
        {
          uid: organizerUid,
          name: eventData.organizer?.name || 'Organizer',
          photoURL: eventData.organizer?.photoURL,
          role: 'organizer',
        },
      ]);
    } catch {
      setError('Something went wrong loading this event.');
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setLoading(false);
      setError('Please sign in to rate this event.');
      return;
    }
    load();
  }, [initializing, user, load]);

  const currentPerson = people[currentIndex];
  const options = qualitiesFor(currentPerson?.role === 'organizer' ? 'organizer' : 'attendee');
  const currentSelection = currentPerson ? selections[currentPerson.uid] : undefined;
  const isLast = currentIndex === people.length - 1;
  const progressPct = people.length ? ((currentIndex + 1) / people.length) * 100 : 0;

  const setQuality = (quality: Quality) => {
    if (!currentPerson) return;
    setSelections((prev) => ({
      ...prev,
      [currentPerson.uid]: { quality, stars: prev[currentPerson.uid]?.stars ?? 5 },
    }));
  };

  const setStars = (stars: number) => {
    if (!currentPerson) return;
    setSelections((prev) => {
      const existing = prev[currentPerson.uid];
      if (!existing) return prev;
      return { ...prev, [currentPerson.uid]: { ...existing, stars } };
    });
  };

  const submitAll = async (finalSelections: typeof selections) => {
    const entries = people
      .map((person) => {
        const selection = finalSelections[person.uid];
        if (!selection) return null;
        return {
          rateeUid: person.uid,
          rateeRole: person.role,
          qualityId: selection.quality.id,
          qualityLabel: selection.quality.label,
          qualityEmoji: selection.quality.emoji,
          stars: selection.stars,
        };
      })
      .filter(Boolean) as Parameters<typeof dataService.submitRatings>[1];

    if (entries.length === 0) {
      router.back();
      return;
    }

    setSubmitting(true);
    try {
      await dataService.submitRatings(eventId, entries);
      setIsComplete(true);
      setTimeout(() => router.back(), 1800);
    } catch {
      Alert.alert('Could not save', 'Your ratings did not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onNext = () => {
    if (!currentSelection) return;
    if (isLast) return submitAll(selections);
    setCurrentIndex((index) => index + 1);
  };

  const onSkip = () => {
    if (isLast) return submitAll(selections);
    setCurrentIndex((index) => index + 1);
  };

  if (initializing || loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Nothing to rate</Text>
        <Text style={styles.emptyBody}>{error}</Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryBtn, { marginTop: 20 }]}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <CheckCircle size={56} color="#16a34a" />
        <Text style={[styles.emptyTitle, { marginTop: 16 }]}>Thanks for the feedback</Text>
        <Text style={styles.emptyBody}>
          Your ratings help everyone find better events and better people.
        </Text>
      </View>
    );
  }

  if (!currentPerson) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Nobody to rate</Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryBtn, { marginTop: 20 }]}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event?.title || 'Rate this event'}
          </Text>
          <Text style={styles.headerMeta}>
            {currentIndex + 1} of {people.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.personCard}>
          <Avatar
            uid={currentPerson.uid}
            name={currentPerson.name}
            photoURL={currentPerson.photoURL}
            size={76}
          />
          <Text style={styles.personName}>{currentPerson.name}</Text>
          <Text style={styles.personRole}>
            {currentPerson.role === 'organizer' ? 'Organized this event' : 'Attended this event'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          What stood out about {currentPerson.name.split(' ')[0]}?
        </Text>

        <View style={{ gap: 10, marginBottom: 24 }}>
          {options.map((option) => {
            const selected = currentSelection?.quality.id === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setQuality(option)}
                style={[styles.qualityCard, selected && styles.qualityCardSelected]}
              >
                <View style={[styles.qualityIcon, { backgroundColor: option.tint[0] }]}>
                  <option.Icon size={19} color={option.tint[1]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.qualityLabel, selected && styles.qualityLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.qualityDesc}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {currentSelection && (
          <View style={{ marginBottom: 26 }}>
            <Text style={styles.sectionTitle}>Overall</Text>
            <View style={styles.starRow}>
              {STAR_VALUES.map((value) => (
                <Pressable key={value} onPress={() => setStars(value)} hitSlop={6}>
                  <Star
                    size={32}
                    color="#f59e0b"
                    fill={value <= currentSelection.stars ? '#f59e0b' : 'none'}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable
          onPress={onNext}
          disabled={!currentSelection || submitting}
          style={[styles.primaryBtn, (!currentSelection || submitting) && styles.btnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isLast ? 'Submit ratings' : 'Next person'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={onSkip} disabled={submitting} style={styles.skipBtn}>
          <Text style={styles.skipText}>{isLast ? 'Finish without rating' : 'Skip this person'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 28 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  iconBtn: { padding: 6, borderRadius: 999 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  progressTrack: { height: 3, backgroundColor: '#e5e7eb' },
  progressFill: { height: 3, backgroundColor: '#4f46e5' },

  personCard: { alignItems: 'center', marginBottom: 26 },
  personAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  personName: { fontSize: 19, fontWeight: '700', color: '#111827' },
  personRole: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  qualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  qualityCardSelected: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  qualityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  qualityLabelSelected: { color: '#4338ca' },
  qualityDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  starRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },

  primaryBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.45 },

  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
