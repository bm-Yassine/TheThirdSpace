import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Calendar, History } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

type Organizer = {
  name: string;
  avatar?: string;
};

type ActivityStub = {
  id: number | string;
  title: string;
  date: string;
  time: string;
  attendees: number;
};

// Mock data for organizer activities
const mockOrganizerActivities: { upcoming: ActivityStub[]; past: ActivityStub[] } = {
  upcoming: [
    { id: 1, title: 'Morning Yoga Session', date: 'Today', time: '8:00 AM', attendees: 12 },
    { id: 2, title: 'Meditation Workshop', date: 'Saturday', time: '10:00 AM', attendees: 8 },
  ],
  past: [
    { id: 3, title: 'Sunset Yoga', date: 'Last Week', time: '6:00 PM', attendees: 15 },
    { id: 4, title: 'Beginners Yoga', date: '2 weeks ago', time: '9:00 AM', attendees: 10 },
  ],
};

const mockOrganizerQualities = {
  organizerQualities: [
    { quality: 'Super Organized', emoji: '📋', count: 15 },
    { quality: 'Very Welcoming', emoji: '🤗', count: 12 },
    { quality: 'High Energy', emoji: '⚡', count: 9 },
  ],
  attendeeQuality: { quality: 'Highly Engaged', emoji: '🎯', count: 8 },
};

export default function OrganizerInfoScreen() {
  const params = useLocalSearchParams();
  const organizerName = params.organizerName as string;

  const organizer: Organizer = {
    name: organizerName || 'Unknown Organizer',
    avatar: '👤',
  };

  const handleActivityClick = (activity: ActivityStub) => {
    router.push({
      pathname: './activity_detail',
      params: { eventId: activity.id.toString() }
    });
  };

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
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Attendees</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.h4}>About</Text>
            <Text style={styles.body}>
              Hi! I'm Sarah, a certified yoga instructor with over 5 years of experience. I love bringing
              people together for mindful movement and creating inclusive spaces where everyone feels
              welcome. When I'm not teaching, you can find me hiking or trying new coffee shops around the city.
            </Text>
          </View>

          {/* Qualities */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.h4}>Top Qualities</Text>

            <Text style={[styles.subtle, { marginTop: 6 }]}>As a Host</Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {mockOrganizerQualities.organizerQualities.map((q, i) => (
                <View key={i} style={[styles.qualityCard, styles.qualityBlue]}>
                  <View style={styles.rowCenter}>
                    <Text style={styles.qualityEmoji}>{q.emoji}</Text>
                    <Text style={styles.qualityText}>{q.quality}</Text>
                  </View>
                  <Text style={styles.qualityMeta}>{q.count} votes</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.subtle, { marginTop: 12 }]}>As an Attendee</Text>
            <View style={[styles.qualityCard, styles.qualityGreen, { marginTop: 4 }]}>
              <View style={styles.rowCenter}>
                <Text style={styles.qualityEmoji}>{mockOrganizerQualities.attendeeQuality.emoji}</Text>
                <Text style={styles.qualityText}>{mockOrganizerQualities.attendeeQuality.quality}</Text>
              </View>
              <Text style={styles.qualityMeta}>{mockOrganizerQualities.attendeeQuality.count} votes</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Activities */}
        <View style={[styles.section, styles.divider]}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#6b7280" />
            <Text style={styles.h4}>Upcoming Activities</Text>
          </View>

          <View style={{ gap: 10 }}>
            {mockOrganizerActivities.upcoming.map((a) => (
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
            {mockOrganizerActivities.past.map((a) => (
              <Pressable key={a.id} onPress={() => handleActivityClick(a)} style={styles.card}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.subtle}>{a.date} • {a.time}</Text>
                <Text style={styles.meta}>{a.attendees} attendees</Text>
              </Pressable>
            ))}
          </View>
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
});
