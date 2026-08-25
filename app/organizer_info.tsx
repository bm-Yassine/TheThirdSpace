import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Calendar, History } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { formatEventDate, formatEventTime, byStartAscending, byStartDescending, hasEventEnded } from '../lib/eventTime';
import type { Rating, ReputationSummary } from '../lib/types';
import { useAuth } from '../lib/auth';

type Organizer = {
  uid?: string;
  name: string;
  avatar?: string;
  email?: string;
  bio?: string;
  stats?: {
    eventsJoined?: number;
    eventsCreated?: number;
    rating?: number;
  };
};

type ActivityStub = {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: number;
};

export default function OrganizerInfoScreen() {
  const { user: currentUser } = useAuth();
  const params = useLocalSearchParams();
  const organizerUid = params.organizerUid as string;
  const organizerName = params.organizerName as string;
  
  const [organizer, setOrganizer] = useState<Organizer>({
    uid: organizerUid || undefined,
    name: organizerName || 'Unknown Organizer',
    avatar: '👤',
  });
  const [upcomingActivities, setUpcomingActivities] = useState<ActivityStub[]>([]);
  const [pastActivities, setPastActivities] = useState<ActivityStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    loadOrganizerData();
  }, [organizerUid]);

  const loadOrganizerData = async () => {
    const targetUid = organizerUid || '';
    if (!targetUid && !organizerName) {
      setLoading(false);
      return;
    }

    try {
      let profile = targetUid ? await dataService.getUserProfile(targetUid) : null;
      if (!profile && organizerName) {
        profile = await dataService.getUserByDisplayName(organizerName);
      }

      if (profile) {
        setOrganizer({
          uid: profile.uid,
          name: profile.displayName || 'Unknown Organizer',
          avatar: profile.photoURL ? '👤' : '👤',
          email: profile.email,
          bio: profile.bio || 'Hi! I\'m an event organizer passionate about bringing people together for amazing experiences.',
          stats: profile.stats,
        });

        const [events, reputationSummary, receivedRatings] = await Promise.all([
          dataService.getEvents({ organizerId: profile.uid }),
          dataService.getReputation(profile.uid!).catch(() => null),
          dataService.getUserRatings(profile.uid!).catch(() => [] as Rating[]),
        ]);
        setReputation(reputationSummary);
        setRatings(receivedRatings);

        const toStub = (event: any) => ({
          id: String(event.id),
          title: event.title || 'Untitled Event',
          date: formatEventDate(event),
          time: formatEventTime(event),
          attendees: Number(event.attendees || 0),
        });

        setUpcomingActivities(
          (events as any[]).filter((e) => !hasEventEnded(e)).sort(byStartAscending).map(toStub)
        );
        setPastActivities(
          (events as any[]).filter((e) => hasEventEnded(e)).sort(byStartDescending).map(toStub)
        );
      } else {
        setOrganizer((prev) => ({
          ...prev,
          uid: organizerUid || prev.uid,
          name: organizerName || prev.name,
        }));
      }
    } catch (error) {
      console.error('Error loading organizer profile:', error);
      Alert.alert('Error', 'Failed to load organizer profile.');
    } finally {
      setLoading(false);
    }
  };

  const topQualities = useMemo(() => {
    if (!reputation?.qualityCounts) return [] as [string, number][];
    return Object.entries(reputation.qualityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [reputation]);

  const handleActivityClick = (activity: ActivityStub) => {
    router.push({
      pathname: '/activity_detail',
      params: { eventId: activity.id.toString() },
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <Text style={styles.h2}>Organizer Profile</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Organizer info */}
        <View style={styles.section}>
          <View style={styles.rowCenter}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 26 }}>{organizer.avatar || '👤'}</Text>
            </View>
            <View>
              <Text style={styles.h3}>{organizer.name}</Text>
              <Text style={styles.subtle}>Event Organizer</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{organizer.stats?.eventsCreated || 0}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{organizer.stats?.eventsJoined || 0}</Text>
              <Text style={styles.statLabel}>Participated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {reputation?.averageStars ? reputation.averageStars.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Bio */}
          {organizer.bio && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.h4}>About</Text>
              <Text style={styles.body}>
                {organizer.bio}
              </Text>
            </View>
          )}

          {/* Reputation, aggregated from real ratings */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.h4}>Reputation</Text>

            {!reputation || reputation.ratingCount === 0 ? (
              <Text style={[styles.subtle, { marginTop: 6 }]}>
                No ratings yet. Reputation appears once attendees rate an event that has
                finished.
              </Text>
            ) : (
              <>
                <Text style={[styles.subtle, { marginTop: 6 }]}>
                  {reputation.averageStars.toFixed(1)} average from {reputation.ratingCount} rating
                  {reputation.ratingCount === 1 ? '' : 's'}
                </Text>

                <View style={{ gap: 8, marginTop: 8 }}>
                  {topQualities.map(([label, count]) => {
                    const sample = ratings.find(
                      (rating) => (rating.qualityLabel || rating.qualityId) === label
                    );
                    return (
                      <View key={label} style={[styles.qualityCard, styles.qualityBlue]}>
                        <View style={styles.rowCenter}>
                          <Text style={styles.qualityEmoji}>{sample?.qualityEmoji || '⭐'}</Text>
                          <Text style={styles.qualityText}>{label}</Text>
                        </View>
                        <Text style={styles.qualityMeta}>
                          {count} vote{count === 1 ? '' : 's'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Upcoming Activities */}
        <View style={[styles.section, styles.divider]}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#6b7280" />
            <Text style={styles.h4}>Upcoming Activities</Text>
          </View>

          <View style={{ gap: 10 }}>
            {upcomingActivities.length === 0 && (
              <Text style={styles.subtle}>No upcoming activities yet.</Text>
            )}
            {upcomingActivities.map((a) => (
              <Pressable key={a.id} onPress={() => handleActivityClick(a)} style={styles.card}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.subtle}>{a.date} • {a.time}</Text>
                <Text style={styles.meta}>{a.attendees} attendees</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Past Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <History size={18} color="#6b7280" />
            <Text style={styles.h4}>Past Activities</Text>
          </View>

          <View style={{ gap: 10 }}>
            {pastActivities.length === 0 && (
              <Text style={styles.subtle}>No past activities yet.</Text>
            )}
            {pastActivities.map((a) => (
              <Pressable key={a.id} onPress={() => handleActivityClick(a)} style={styles.card}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.subtle}>{a.date} • {a.time}</Text>
                <Text style={styles.meta}>{a.attendees} attendees</Text>
              </Pressable>
            ))}
          </View>

          {!!organizer.uid && organizer.uid !== currentUser?.uid && (
            <Pressable
              style={styles.messageBtn}
              onPress={() =>
                router.push({
                  pathname: '/chats',
                  params: { otherUserId: organizer.uid },
                })
              }
            >
              <Text style={styles.messageBtnText}>Message Organizer</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  iconBtn: { padding: 6, borderRadius: 999 },
  h2: { fontSize: 18, fontWeight: '700', color: '#111827' },
  h3: { fontSize: 16, fontWeight: '600', color: '#111827' },
  h4: { fontSize: 14, fontWeight: '600', color: '#111827' },
  subtle: { fontSize: 12, color: '#6b7280' },
  body: { fontSize: 13, color: '#374151', lineHeight: 18 },

  section: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  divider: { },

  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },

  statsRow: {
    marginTop: 8, flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  qualityCard: {
    padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualityBlue: { backgroundColor: '#eff6ff' },
  qualityGreen: { backgroundColor: '#ecfdf5' },
  qualityEmoji: { fontSize: 18, marginRight: 8 },
  qualityText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  qualityMeta: { fontSize: 12, color: '#6b7280' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  messageBtn: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
