import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  Edit,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';

// ---------- Mock data (kept from your web file) ----------
const userData = {
  name: 'John Doe',
  email: 'john.doe@email.com',
  avatar: '👤',
  stats: { eventsJoined: 12, eventsCreated: 3, rating: 4.9 },
  interests: ['Photography', 'Yoga', 'Reading', 'Technology', 'Art'],
  organizerQualities: [
    { quality: 'Super Organized', emoji: '📋', count: 8 },
    { quality: 'Very Welcoming', emoji: '🤗', count: 6 },
    { quality: 'High Energy', emoji: '⚡', count: 5 },
  ],
  attendeeQuality: { quality: 'Highly Engaged', emoji: '🎯', count: 7 },
};

const createdEvents = [
  {
    id: 2,
    title: 'Morning Yoga Session',
    date: 'Sep 20, 2025',
    time: '8:00 AM',
    location: 'Yoga Studio',
    status: 'upcoming',
    waitlist: [
      { id: 4, name: 'David Wilson', avatar: '👨‍💻', needsApproval: true },
      { id: 5, name: 'Emma Brown', avatar: '👩‍🎨', needsApproval: true },
    ],
    attendees: [{ id: 6, name: 'Frank Miller', avatar: '👨‍🎓', status: 'confirmed' }],
  },
  {
    id: 1,
    title: 'Weekend Photography Walk',
    date: 'Aug 15, 2025',
    time: '2:00 PM',
    location: 'Central Park',
    status: 'completed',
    attendees: [
      { id: 1, name: 'Alice Johnson', avatar: '👩', status: 'attended', rated: false },
      { id: 2, name: 'Bob Smith', avatar: '👨', status: 'attended', rated: true },
      { id: 3, name: 'Carol Davis', avatar: '👩‍💼', status: 'absent', rated: true },
    ],
  },
  {
    id: 7,
    title: 'Beach Volleyball Tournament',
    date: 'Dec 1, 2024',
    time: '3:00 PM',
    location: 'Santa Monica Beach',
    status: 'completed',
    attendees: [
      { id: 7, name: 'Mike Wilson', avatar: '👨‍💼', status: 'attended', rated: true },
      { id: 8, name: 'Lisa Chen', avatar: '👩‍💻', status: 'absent', rated: true },
    ],
  },
];

const attendedEvents = [
  {
    id: 5,
    title: 'Art Gallery Tour',
    organizer: { name: 'Anna Garcia', avatar: '👩‍🎨' },
    date: 'Dec 25, 2025',
    status: 'upcoming',
    rated: false,
    userRole: 'attendee' as const,
  },
  {
    id: 3,
    title: 'Book Club Meeting',
    organizer: { name: 'Sarah Wilson', avatar: '👩‍🎓' },
    date: 'Dec 10, 2024',
    status: 'completed',
    rated: false,
    userRole: 'attendee' as const,
  },
  {
    id: 4,
    title: 'Cooking Workshop',
    organizer: { name: 'Chef Mario', avatar: '👨‍🍳' },
    date: 'Dec 5, 2024',
    status: 'completed',
    rated: true,
    userRole: 'attendee' as const,
  },
  {
    id: 6,
    title: 'Hiking Adventure',
    organizer: { name: 'Tom Rodriguez', avatar: '👨‍🏫' },
    date: 'Nov 28, 2024',
    status: 'completed',
    rated: false,
    userRole: 'attendee' as const,
  },
];

type EventItem = (typeof createdEvents)[number];
type AttendedItem = (typeof attendedEvents)[number];

type Props = {
  onNavigate?: (screen: string) => void;
  onEventRatingClick?: (event: any, userRole: 'attendee' | 'organizer') => void;
};

export default function ProfileScreen({ onNavigate, onEventRatingClick }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'created' | 'attended'>(
    'overview'
  );

  const menuItems = [
    { icon: Edit, label: 'Edit Profile', action: () => {} },
    { icon: Bell, label: 'Notifications', action: () => {} },
    { icon: Settings, label: 'Settings', action: () => {} },
    { icon: HelpCircle, label: 'Help & Support', action: () => {} },
    { icon: LogOut, label: 'Log Out', action: () => {}, danger: true },
  ];

  const handleEventClick = (event: any, userRole: 'attendee' | 'organizer') => {
    if (event.status === 'completed' && userRole === 'attendee' && !event.rated) {
      onEventRatingClick?.(event, userRole);
    } else if (event.status === 'completed' && userRole === 'organizer') {
      onEventRatingClick?.(event, userRole);
    }
  };

  const handleWaitlistApproval = (eventId: number, userId: number, approve: boolean) => {
    console.log(`${approve ? 'Approved' : 'Rejected'} user ${userId} for event ${eventId}`);
  };

  const TabButton = ({
    id,
    label,
  }: {
    id: 'overview' | 'created' | 'attended';
    label: string;
  }) => (
    <Pressable
      onPress={() => setActiveTab(id)}
      style={[
        styles.tabBtn,
        activeTab === id ? styles.tabBtnActive : styles.tabBtnInactive,
      ]}
    >
      <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  const Overview = () => (
    <View style={styles.section}>
      {/* User header */}
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{userData.avatar}</Text>
        </View>
        <View>
          <Text style={styles.h2}>{userData.name}</Text>
          <Text style={styles.muted}>{userData.email}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.eventsJoined}</Text>
          <Text style={styles.statLabel}>Events Joined</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.eventsCreated}</Text>
          <Text style={styles.statLabel}>Events Created</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Qualities */}
      <View style={styles.block}>
        <Text style={styles.h3}>Your Top Qualities</Text>

        <Text style={styles.subtle}>As an Organizer</Text>
        <View style={{ gap: 8 }}>
          {userData.organizerQualities.map((q, i) => (
            <View key={i} style={styles.qualityCardBlue}>
              <View style={styles.rowCenter}>
                <Text style={styles.qualityEmoji}>{q.emoji}</Text>
                <Text style={styles.qualityText}>{q.quality}</Text>
              </View>
              <Text style={styles.qualityMeta}>{q.count} votes</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.subtle, { marginTop: 16 }]}>As an Attendee</Text>
        <View style={styles.qualityCardGreen}>
          <View style={styles.rowCenter}>
            <Text style={styles.qualityEmoji}>{userData.attendeeQuality.emoji}</Text>
            <Text style={styles.qualityText}>{userData.attendeeQuality.quality}</Text>
          </View>
          <Text style={styles.qualityMeta}>{userData.attendeeQuality.count} votes</Text>
        </View>
      </View>

      {/* Interests */}
      <View style={styles.block}>
        <Text style={styles.h3}>Interests</Text>
        <View style={styles.tagsWrap}>
          {userData.interests.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' }}>
        {menuItems.map((m, i) => {
          const Icon = m.icon;
          return (
            <Pressable
              key={i}
              onPress={m.action}
              style={styles.menuItem}
              android_ripple={{ color: '#f1f5f9' }}
            >
              <Icon size={20} color={m.danger ? '#dc2626' : '#111827'} />
              <Text style={[styles.menuText, m.danger && { color: '#dc2626' }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const CreatedEvents = () => (
    <View style={styles.section}>
      <Text style={styles.h3}>Your Created Events</Text>
      <View style={{ height: 12 }} />
      {createdEvents.map((event) => (
        <View key={event.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{event.title}</Text>
            <View
              style={[
                styles.badge,
                event.status === 'completed'
                  ? styles.badgeGray
                  : event.status === 'upcoming'
                  ? styles.badgeBlue
                  : styles.badgeYellow,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  event.status === 'completed'
                    ? styles.badgeTextGray
                    : event.status === 'upcoming'
                    ? styles.badgeTextBlue
                    : styles.badgeTextYellow,
                ]}
              >
                {event.status}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color="#64748b" />
              <Text style={styles.metaText}>{event.date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color="#64748b" />
              <Text style={styles.metaText}>{event.time}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color="#64748b" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          </View>

          {/* Waitlist (upcoming) */}
          {event.status === 'upcoming' && event.waitlist && event.waitlist.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.subHead}>Waiting for Approval</Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                {event.waitlist.map((p) => (
                  <View key={p.id} style={styles.waitRow}>
                    <View style={styles.rowCenter}>
                      <Text style={{ fontSize: 16 }}>{p.avatar}</Text>
                      <Text style={styles.waitName}>{p.name}</Text>
                    </View>
                    <View style={styles.rowCenter}>
                      <Pressable
                        onPress={() => handleWaitlistApproval(event.id, p.id, true)}
                        style={[styles.smallBtn, styles.smallBtnGreen]}
                      >
                        <Text style={styles.smallBtnText}>Approve</Text>
                      </Pressable>
                      <View style={{ width: 8 }} />
                      <Pressable
                        onPress={() => handleWaitlistApproval(event.id, p.id, false)}
                        style={[styles.smallBtn, styles.smallBtnRed]}
                      >
                        <Text style={styles.smallBtnText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Attendees */}
          {!!event.attendees?.length && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.subHead}>
                {event.status === 'completed' ? 'Attendees' : 'Confirmed Attendees'}
              </Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                {event.attendees.map((a) => (
                  <View key={a.id} style={styles.attendeeRow}>
                    <View style={styles.rowCenter}>
                      <Text style={{ fontSize: 16 }}>{a.avatar}</Text>
                      <Text style={styles.attendeeName}>{a.name}</Text>
                      {a.status === 'attended' && event.status === 'completed' && (
                        <Text style={styles.attendedMark}>✓ Attended</Text>
                      )}
                    </View>

                    {event.status === 'completed' && (
                      <>
                        {a.status === 'attended' ? (
                          <Pressable
                            onPress={() => handleEventClick(event, 'organizer')}
                            style={[
                              styles.pillBtn,
                              'rated' in a && a.rated ? styles.pillRated : styles.pillRate,
                            ]}
                          >
                            <Text
                              style={[
                                styles.pillText,
                                'rated' in a && a.rated ? styles.pillTextRated : styles.pillTextRate,
                              ]}
                            >
                              {'rated' in a && a.rated ? 'Rated' : 'Rate'}
                            </Text>
                          </Pressable>
                        ) : (
                          <View style={[styles.pillBtn, styles.pillGray]}>
                            <Text style={[styles.pillText, styles.pillTextGray]}>
                              Absent
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const AttendedEvents = () => (
    <View style={styles.section}>
      <FlatList
        data={attendedEvents}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleEventClick(item, item.userRole)}
            style={styles.cardPressable}
            android_ripple={{ color: '#f1f5f9' }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.rowCenter}>
                {item.status === 'completed' && !item.rated && (
                  <View style={[styles.badge, styles.badgeOrange]}>
                    <Text style={[styles.badgeText, styles.badgeTextOrange]}>
                      Rate Event
                    </Text>
                  </View>
                )}
                {item.rated && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={[styles.badgeText, styles.badgeTextGreen]}>✓ Rated</Text>
                  </View>
                )}
                <ChevronRight size={16} color="#9ca3af" />
              </View>
            </View>

            <View style={styles.rowCenter}>
              <Text style={{ fontSize: 14 }}>{item.organizer.avatar}</Text>
              <Text style={styles.metaText}>by {item.organizer.name}</Text>
            </View>

            <Text style={[styles.metaText, { marginTop: 2 }]}>{item.date}</Text>
          </Pressable>
        )}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>Profile</Text>
        <View style={styles.tabsRow}>
          <TabButton id="overview" label="Overview" />
          <TabButton id="created" label="Created Events" />
          <TabButton id="attended" label="Attended Events" />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'created' && <CreatedEvents />}
        {activeTab === 'attended' && <AttendedEvents />}
      </ScrollView>
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  h1: { fontSize: 24, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 18, fontWeight: '600', color: '#111827' },
  h3: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  subtle: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  muted: { fontSize: 14, color: '#6b7280' },

  tabsRow: { flexDirection: 'row', marginTop: 12 },
  tabBtn: {
    paddingVertical: 8,
    marginRight: 16,
    borderBottomWidth: 2,
  },
  tabBtnActive: { borderBottomColor: '#111827' },
  tabBtnInactive: { borderBottomColor: 'transparent' },
  tabText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#111827' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  block: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    marginTop: 12,
  },

  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 26 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  qualityCardBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  qualityCardGreen: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
  },
  qualityEmoji: { fontSize: 18, marginRight: 8 },
  qualityText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  qualityMeta: { fontSize: 12, color: '#6b7280' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  tagText: { color: '#374151', fontSize: 13 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  menuText: { fontSize: 15, color: '#111827' },

  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  cardPressable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b' },

  subHead: { fontSize: 13, fontWeight: '600', color: '#111827' },

  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fef9c3',
    borderRadius: 8,
  },
  waitName: { fontSize: 14, color: '#111827', marginLeft: 8 },

  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnGreen: { backgroundColor: '#16a34a' },
  smallBtnRed: { backgroundColor: '#dc2626' },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  attendeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attendeeName: { fontSize: 14, color: '#111827', marginLeft: 8 },
  attendedMark: { fontSize: 12, color: '#16a34a', marginLeft: 6 },

  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillRate: { backgroundColor: '#dbeafe' },
  pillTextRate: { color: '#1d4ed8' },
  pillRated: { backgroundColor: '#dcfce7' },
  pillTextRated: { color: '#16a34a' },
  pillGray: { backgroundColor: '#f3f4f6' },
  pillTextGray: { color: '#6b7280' },
  pillText: { fontSize: 12, fontWeight: '600' },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeTextBlue: { color: '#1d4ed8' },
  badgeYellow: { backgroundColor: '#fef3c7' },
  badgeTextYellow: { color: '#b45309' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeTextGray: { color: '#6b7280' },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeTextGreen: { color: '#16a34a' },
  badgeOrange: { backgroundColor: '#ffedd5' },
  badgeTextOrange: { color: '#c2410c' },
});
