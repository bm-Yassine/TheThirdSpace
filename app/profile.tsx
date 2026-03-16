import React, { useEffect, useMemo, useState } from 'react';
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
import { LogOut, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import { authService, dataService, type UserProfile } from '../Backend/firebase';
import type { Event } from '../lib/types';

type TabKey = 'overview' | 'created' | 'joined';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInterests, setEditInterests] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) {
          Alert.alert('Authentication Required', 'Please sign in to view your profile.', [
            { text: 'OK', onPress: () => router.replace('/login') },
          ]);
          return;
        }

        let me = await dataService.getCurrentUserProfile();
        if (!me) {
          me = await dataService.ensureUserProfileFromAuthUser(user);
        }
        setProfile(me);

        const [created, commitments] = await Promise.all([
          dataService.getEvents({ organizerId: user.uid, limit: 50 }),
          dataService.getUserCommitments(),
        ]);

        const normalizedCreated = (created as Event[]).map((e) => ({
          ...e,
          organizer: e.organizer || { uid: user.uid, name: me?.displayName || 'You', avatar: '👤' },
        }));
        setCreatedEvents(normalizedCreated);

        const joinedIds = commitments.map((c: any) => String(c.eventId));
        const joinedFetches = await Promise.all(joinedIds.map((id) => dataService.getEvent(id)));
        const validJoined = joinedFetches.filter(Boolean) as Event[];
        setJoinedEvents(validJoined);
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const stats = useMemo(() => {
    return {
      eventsJoined: profile?.stats?.eventsJoined ?? joinedEvents.length,
      eventsCreated: profile?.stats?.eventsCreated ?? createdEvents.length,
      rating: profile?.stats?.rating ?? 0,
    };
  }, [profile, createdEvents.length, joinedEvents.length]);

  useEffect(() => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || '');
    setEditBio(profile.bio || '');
    setEditInterests((profile.interests || []).join(', '));
  }, [profile]);

  const onSaveProfile = async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in again to update your profile.');
      router.replace('/login');
      return;
    }

    const nextName = editDisplayName.trim();
    if (!nextName) {
      Alert.alert('Missing Name', 'Please enter your name.');
      return;
    }

    const interests = editInterests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setSavingProfile(true);
    try {
      await dataService.updateUserProfile(user.uid, {
        displayName: nextName,
        bio: editBio.trim(),
        interests,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: nextName,
              bio: editBio.trim(),
              interests,
            }
          : prev
      );
      setIsEditingProfile(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
            router.replace('/login');
          } catch {
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  const openEvent = (eventId: string | number) => {
    router.push({ pathname: '/activity_detail', params: { eventId: String(eventId) } });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.h1}>Profile</Text>
        <View style={styles.tabsRow}>
          {(['overview', 'created', 'joined'] as TabKey[]).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Overview' : tab === 'created' ? 'Created Events' : 'Joined Events'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {activeTab === 'overview' && (
          <>
            <View style={styles.userRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>👤</Text></View>
              <View>
                <Text style={styles.h2}>{profile?.displayName || 'User'}</Text>
                <Text style={styles.muted}>{profile?.email || ''}</Text>
              </View>
            </View>

            {!isEditingProfile ? (
              <View style={styles.profileDetailsCard}>
                <Text style={styles.profileLabel}>Bio</Text>
                <Text style={styles.profileValue}>{profile?.bio?.trim() || 'Tell others about yourself.'}</Text>
                <Text style={[styles.profileLabel, { marginTop: 10 }]}>Interests</Text>
                <Text style={styles.profileValue}>
                  {profile?.interests?.length ? profile.interests.join(', ') : 'Add your interests (music, sports, food...)'}
                </Text>

                <Pressable style={styles.editBtn} onPress={() => setIsEditingProfile(true)}>
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.profileDetailsCard}>
                <Text style={styles.profileLabel}>Name</Text>
                <TextInput
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Your name"
                  style={styles.input}
                />

                <Text style={[styles.profileLabel, { marginTop: 10 }]}>Bio</Text>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Short bio"
                  multiline
                  style={[styles.input, styles.textArea]}
                />

                <Text style={[styles.profileLabel, { marginTop: 10 }]}>Interests</Text>
                <TextInput
                  value={editInterests}
                  onChangeText={setEditInterests}
                  placeholder="Music, Art, Hiking"
                  style={styles.input}
                />

                <View style={styles.editActionsRow}>
                  <Pressable
                    style={[styles.editBtn, styles.cancelBtn]}
                    onPress={() => {
                      setIsEditingProfile(false);
                      setEditDisplayName(profile?.displayName || '');
                      setEditBio(profile?.bio || '');
                      setEditInterests((profile?.interests || []).join(', '));
                    }}
                    disabled={savingProfile}
                  >
                    <Text style={[styles.editBtnText, styles.cancelBtnText]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.editBtn} onPress={onSaveProfile} disabled={savingProfile}>
                    <Text style={styles.editBtnText}>{savingProfile ? 'Saving...' : 'Save'}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.eventsJoined}</Text><Text style={styles.statLabel}>Joined</Text></View>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.eventsCreated}</Text><Text style={styles.statLabel}>Created</Text></View>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View>
            </View>

            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={18} color="#dc2626" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </>
        )}

        {activeTab === 'created' && (
          <View style={styles.listWrap}>
            {createdEvents.length === 0 && <Text style={styles.muted}>You have not created events yet.</Text>}
            {createdEvents.map((event) => (
              <Pressable key={String(event.id)} style={styles.card} onPress={() => openEvent(event.id)}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <Text style={styles.cardMeta}>{event.date || 'TBD'} • {event.time || 'TBD'}</Text>
                <Text style={styles.cardMeta}>{event.location || 'Location TBD'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === 'joined' && (
          <View style={styles.listWrap}>
            {joinedEvents.length === 0 && <Text style={styles.muted}>You have not joined events yet.</Text>}
            {joinedEvents.map((event) => (
              <Pressable key={String(event.id)} style={styles.cardRow} onPress={() => openEvent(event.id)}>
                <View>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <Text style={styles.cardMeta}>{event.date || 'TBD'} • {event.time || 'TBD'}</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingNavigation activeScreen="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  h1: { fontSize: 24, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 18, fontWeight: '600', color: '#111827' },
  muted: { fontSize: 13, color: '#6b7280' },
  tabsRow: { flexDirection: 'row', marginTop: 10 },
  tabBtn: { marginRight: 14, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#111827' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#111827' },

  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 28 },
  profileDetailsCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  profileLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  editBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignSelf: 'auto',
  },
  cancelBtnText: {
    color: '#374151',
  },

  statsRow: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
  },
  logoutText: { color: '#dc2626', fontWeight: '700' },

  listWrap: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
  },
  cardRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
