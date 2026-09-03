import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { LogOut, ChevronRight, Star, Calendar, History, Settings, Camera } from 'lucide-react-native';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfilePhoto } from '../lib/storage';
import { DEMO_MODE } from '../lib/config';
import { router, useFocusEffect } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import { dataService, type UserCommitment } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import {
  byStartAscending,
  byStartDescending,
  formatEventDate,
  formatEventTime,
  formatRelativeToNow,
  hasEventEnded,
} from '../lib/eventTime';
import type { Event, ReputationSummary } from '../lib/types';

type TabKey = 'overview' | 'hosting' | 'upcoming' | 'history';

type JoinedEvent = { event: Event; commitment: UserCommitment };

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
];

export default function ProfileScreen() {
  const { user, profile, initializing, patchProfile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joined, setJoined] = useState<JoinedEvent[]>([]);
  const [awaitingRating, setAwaitingRating] = useState<
    { event: any; role: 'organizer' | 'attendee' }[]
  >([]);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInterests, setEditInterests] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [created, commitments, pendingRatings, reputationSummary] = await Promise.all([
        dataService.getCurrentUserCreatedEvents(50),
        dataService.getUserCommitments(),
        dataService.getEventsAwaitingRating().catch(() => []),
        dataService.getReputation(user.uid).catch(() => null),
      ]);

      setCreatedEvents(created as Event[]);
      setAwaitingRating(pendingRatings);
      setReputation(reputationSummary);

      // Declined requests are dropped — they are not part of the user's history.
      const relevant = commitments.filter((commitment) => commitment.status !== 'declined');
      const events = await Promise.all(
        relevant.map((commitment) => dataService.getEvent(String(commitment.eventId)))
      );

      setJoined(
        relevant
          .map((commitment, index) =>
            events[index] ? { event: events[index] as Event, commitment } : null
          )
          .filter(Boolean) as JoinedEvent[]
      );
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load your profile data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (initializing) return;
      if (!user) {
        router.replace('/login');
        return;
      }
      loadProfileData();
    }, [initializing, user, loadProfileData])
  );

  useEffect(() => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || '');
    setEditBio(profile.bio || '');
    setEditInterests((profile.interests || []).join(', '));
  }, [profile]);

  const { upcoming, history } = useMemo(() => {
    const up: JoinedEvent[] = [];
    const past: JoinedEvent[] = [];
    joined.forEach((item) => {
      if (hasEventEnded(item.event)) past.push(item);
      else up.push(item);
    });
    return {
      upcoming: up.sort((a, b) => byStartAscending(a.event, b.event)),
      history: past.sort((a, b) => byStartDescending(a.event, b.event)),
    };
  }, [joined]);

  const { hostingUpcoming, hostingPast } = useMemo(() => {
    const up: Event[] = [];
    const past: Event[] = [];
    createdEvents.forEach((event) => {
      if (hasEventEnded(event)) past.push(event);
      else up.push(event);
    });
    return {
      hostingUpcoming: up.sort(byStartAscending),
      hostingPast: past.sort(byStartDescending),
    };
  }, [createdEvents]);

  const topQualities = useMemo(() => {
    if (!reputation?.qualityCounts) return [];
    return Object.entries(reputation.qualityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [reputation]);

  const onChangePhoto = async () => {
    if (!user) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      if (DEMO_MODE) {
        // No Firebase in demo mode; show the local pick so the flow is visible.
        patchProfile({ photoURL: result.assets[0].uri });
        return;
      }

      setUploadingPhoto(true);
      const url = await uploadProfilePhoto(result.assets[0].uri);
      await dataService.updateUserProfile(user.uid, { photoURL: url });
      patchProfile({ photoURL: url });
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      Alert.alert('Upload failed', 'Could not update your photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSaveProfile = async () => {
    if (!user) return;
    const nextName = editDisplayName.trim();
    if (!nextName) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }

    const interests = editInterests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await dataService.updateUserProfile(user.uid, {
        displayName: nextName,
        bio: editBio.trim(),
        interests,
      });
      patchProfile({ displayName: nextName, bio: editBio.trim(), interests });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch {
            Alert.alert('Error', 'Could not log out. Please try again.');
          }
        },
      },
    ]);
  };

  const openEvent = (eventId: string | number) =>
    router.push({ pathname: '/activity_detail', params: { eventId: String(eventId) } });

  if (initializing || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const statusLabel = (commitment: UserCommitment, ended: boolean) => {
    if (ended) return commitment.status === 'confirmed' ? 'Attended' : 'Did not attend';
    if (commitment.paymentStatus === 'pending') return 'Payment pending';
    if (commitment.status === 'waitlisted') return 'On waitlist';
    if (commitment.status === 'pending') return 'Awaiting approval';
    return 'Confirmed';
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.h1}>Profile</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {awaitingRating.length > 0 && (
          <Pressable
            style={styles.ratingPrompt}
            onPress={() =>
              router.push({
                pathname: '/post_event_rating',
                params: { eventId: String(awaitingRating[0].event.id) },
              })
            }
          >
            <Star size={18} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingPromptTitle}>
                {awaitingRating.length} event{awaitingRating.length === 1 ? '' : 's'} to rate
              </Text>
              <Text style={styles.ratingPromptBody} numberOfLines={1}>
                Tell us how “{awaitingRating[0].event.title}” went.
              </Text>
            </View>
            <ChevronRight size={18} color="#b45309" />
          </Pressable>
        )}

        {activeTab === 'overview' && (
          <>
            <View style={styles.userRow}>
              <Pressable onPress={onChangePhoto} style={styles.avatarWrap} disabled={uploadingPhoto}>
                {profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Camera size={13} color="#fff" />
                  )}
                </View>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.h2}>{profile?.displayName || 'User'}</Text>
                <Text style={styles.muted}>{profile?.email || user?.email || ''}</Text>
              </View>
              {!isEditing && (
                <Pressable onPress={() => setIsEditing(true)} style={styles.ghostIconBtn} hitSlop={8}>
                  <Settings size={18} color="#4b5563" />
                </Pressable>
              )}
            </View>

            {!isEditing ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <Text style={styles.fieldValue}>
                  {profile?.bio?.trim() || 'Tell others about yourself.'}
                </Text>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Interests</Text>
                {profile?.interests?.length ? (
                  <View style={styles.tagsWrap}>
                    {profile.interests.map((interest) => (
                      <View key={interest} style={styles.tag}>
                        <Text style={styles.tagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.fieldValue}>Add your interests (music, sports, food…)</Text>
                )}

                <Pressable style={styles.editBtn} onPress={() => setIsEditing(true)}>
                  <Text style={styles.editBtnText}>Edit profile</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Your name"
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Bio</Text>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Short bio"
                  multiline
                  style={[styles.input, styles.textArea]}
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Interests</Text>
                <TextInput
                  value={editInterests}
                  onChangeText={setEditInterests}
                  placeholder="Music, Art, Hiking"
                  style={styles.input}
                />
                <Text style={styles.helper}>Separate with commas.</Text>

                <View style={styles.editActionsRow}>
                  <Pressable
                    style={[styles.editBtn, styles.cancelBtn]}
                    disabled={saving}
                    onPress={() => {
                      setIsEditing(false);
                      setEditDisplayName(profile?.displayName || '');
                      setEditBio(profile?.bio || '');
                      setEditInterests((profile?.interests || []).join(', '));
                    }}
                  >
                    <Text style={[styles.editBtnText, styles.cancelBtnText]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.editBtn} onPress={onSaveProfile} disabled={saving}>
                    <Text style={styles.editBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{upcoming.length}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{createdEvents.length}</Text>
                <Text style={styles.statLabel}>Hosted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {reputation?.averageStars ? reputation.averageStars.toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            {topQualities.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>What people say about you</Text>
                <View style={styles.tagsWrap}>
                  {topQualities.map(([qualityId, count]) => (
                    <View key={qualityId} style={styles.qualityBadge}>
                      <Text style={styles.qualityBadgeText}>
                        {qualityId} ×{count}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.helper}>
                  Based on {reputation?.ratingCount || 0} rating
                  {reputation?.ratingCount === 1 ? '' : 's'}.
                </Text>
              </View>
            )}

            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={18} color="#dc2626" />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </>
        )}

        {activeTab === 'hosting' && (
          <View style={{ gap: 18 }}>
            <Section
              title="Upcoming"
              Icon={Calendar}
              emptyText="You have no upcoming events. Tap + to create one."
            >
              {hostingUpcoming.map((event) => (
                <EventRow
                  key={String(event.id)}
                  event={event}
                  onPress={() => openEvent(event.id)}
                  trailing={
                    Number((event as any).pendingCount || 0) > 0
                      ? `${(event as any).pendingCount} pending`
                      : `${event.attendees || 0} going`
                  }
                  highlight={Number((event as any).pendingCount || 0) > 0}
                />
              ))}
            </Section>

            <Section title="Past events you hosted" Icon={History} emptyText="Nothing hosted yet.">
              {hostingPast.map((event) => (
                <EventRow
                  key={String(event.id)}
                  event={event}
                  onPress={() => openEvent(event.id)}
                  trailing={`${event.attendees || 0} attended`}
                />
              ))}
            </Section>
          </View>
        )}

        {activeTab === 'upcoming' && (
          <Section
            title="Events you are going to"
            Icon={Calendar}
            emptyText="Nothing booked yet. Find something in Discover."
          >
            {upcoming.map(({ event, commitment }) => (
              <EventRow
                key={String(event.id)}
                event={event}
                onPress={() => openEvent(event.id)}
                trailing={statusLabel(commitment, false)}
                highlight={commitment.paymentStatus === 'pending'}
              />
            ))}
          </Section>
        )}

        {activeTab === 'history' && (
          <Section
            title="Events you attended"
            Icon={History}
            emptyText="Your attended events will show up here."
          >
            {history.map(({ event, commitment }) => (
              <EventRow
                key={String(event.id)}
                event={event}
                onPress={() => openEvent(event.id)}
                trailing={statusLabel(commitment, true)}
              />
            ))}
          </Section>
        )}
      </ScrollView>

      <FloatingNavigation activeScreen="profile" tone="dark" />
    </View>
  );
}

function Section({
  title,
  Icon,
  emptyText,
  children,
}: {
  title: string;
  Icon: typeof Calendar;
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty = React.Children.count(children) === 0;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.sectionHeader}>
        <Icon size={15} color="#4b5563" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {isEmpty ? <Text style={styles.emptyText}>{emptyText}</Text> : <View style={{ gap: 8 }}>{children}</View>}
    </View>
  );
}

function EventRow({
  event,
  onPress,
  trailing,
  highlight,
}: {
  event: Event;
  onPress: () => void;
  trailing: string;
  highlight?: boolean;
}) {
  return (
    <Pressable style={styles.eventRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventMeta}>
          {formatEventDate(event)} • {formatEventTime(event)}
        </Text>
        <Text style={styles.eventMeta} numberOfLines={1}>
          {event.location || 'Location TBD'}
        </Text>
        <Text style={[styles.eventStatus, highlight && styles.eventStatusHighlight]}>
          {trailing}
          {formatRelativeToNow(event) ? ` · ${formatRelativeToNow(event)}` : ''}
        </Text>
      </View>
      <ChevronRight size={16} color="#9ca3af" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  h1: { fontSize: 26, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 18, fontWeight: '600', color: '#111827' },
  muted: { fontSize: 13, color: '#6b7280' },
  helper: { fontSize: 11, color: '#9ca3af', marginTop: 6 },

  tabsRow: { gap: 6, paddingVertical: 10, paddingRight: 16 },
  tabBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#f3f4f6' },
  tabBtnActive: { backgroundColor: '#111827' },
  tabText: { color: '#4b5563', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarWrap: { width: 62, height: 62 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: { fontSize: 28 },
  ghostIconBtn: { padding: 9, borderRadius: 999, backgroundColor: '#f3f4f6' },

  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  fieldLabel: { fontSize: 12, color: '#6b7280', fontWeight: '700', marginBottom: 5 },
  fieldValue: { fontSize: 14, color: '#111827', lineHeight: 20 },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 74, textAlignVertical: 'top' },

  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  editBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db', alignSelf: 'auto' },
  cancelBtnText: { color: '#374151' },

  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '700', color: '#111827', fontSize: 17 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, color: '#374151' },
  qualityBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  qualityBadgeText: { fontSize: 12, color: '#4338ca', fontWeight: '600' },

  ratingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  ratingPromptTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  ratingPromptBody: { fontSize: 12, color: '#b45309', marginTop: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 6 },

  eventRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  eventMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  eventStatus: { fontSize: 12, color: '#2563eb', marginTop: 5, fontWeight: '700' },
  eventStatusHighlight: { color: '#c2410c' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 13,
  },
  logoutText: { color: '#dc2626', fontWeight: '700' },
});
