import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  X,
  MessageCircle,
  Users,
  Clock,
  UserCheck,
  Star,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { formatEventDate, formatEventTime, hasEventEnded } from '../lib/eventTime';
import type { Attendee } from '../lib/types';

type Section = {
  key: 'pending' | 'confirmed' | 'waitlisted' | 'declined';
  title: string;
  emptyText: string;
  Icon: typeof Users;
};

const SECTIONS: Section[] = [
  {
    key: 'pending',
    title: 'Awaiting your approval',
    emptyText: 'No requests waiting right now.',
    Icon: Clock,
  },
  { key: 'confirmed', title: 'Going', emptyText: 'Nobody has joined yet.', Icon: UserCheck },
  {
    key: 'waitlisted',
    title: 'Waitlist',
    emptyText: 'The waitlist is empty.',
    Icon: Users,
  },
  { key: 'declined', title: 'Declined', emptyText: '', Icon: X },
];

export default function ManageEventScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');
  const { user, initializing } = useAuth();

  const [event, setEvent] = useState<any | null>(null);
  const [participants, setParticipants] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    const data = await dataService.getEvent(eventId);
    setEvent(data);
  }, [eventId]);

  useEffect(() => {
    if (initializing || !eventId) return;

    let active = true;
    loadEvent().finally(() => {
      if (active) setLoading(false);
    });

    // Live so approvals from another device (or a promotion triggered by
    // someone else cancelling) appear without a manual refresh.
    const unsubscribe = dataService.subscribeToEventParticipants(
      eventId,
      (next) => {
        if (active) setParticipants(next);
      },
      () => {
        if (active) setParticipants([]);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [eventId, initializing, loadEvent]);

  const isOrganizer = !!user && !!event && event.createdBy === user.uid;
  const ended = !!event && hasEventEnded(event);

  const grouped = useMemo(() => {
    const buckets: Record<Section['key'], Attendee[]> = {
      pending: [],
      confirmed: [],
      waitlisted: [],
      declined: [],
    };
    participants.forEach((participant) => {
      const bucket = buckets[participant.status as Section['key']];
      if (bucket) bucket.push(participant);
    });
    return buckets;
  }, [participants]);

  const capacityLabel = useMemo(() => {
    if (!event) return '';
    const going = grouped.confirmed.length;
    return event.maxAttendees ? `${going} / ${event.maxAttendees} going` : `${going} going`;
  }, [event, grouped.confirmed.length]);

  const act = async (
    participant: Attendee,
    action: 'approve' | 'decline'
  ) => {
    setPendingUid(participant.uid);
    try {
      if (action === 'approve') {
        await dataService.approveParticipant(eventId, participant.uid);
      } else {
        await dataService.declineParticipant(eventId, participant.uid);
      }
      await loadEvent();
    } catch (error: any) {
      Alert.alert('Could not update', error?.message || 'Please try again.');
    } finally {
      setPendingUid(null);
    }
  };

  const confirmDecline = (participant: Attendee) => {
    Alert.alert(
      `Decline ${participant.name}?`,
      'They will be told the organizer could not fit them in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => act(participant, 'decline') },
      ]
    );
  };

  if (initializing || loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Event not found</Text>
      </View>
    );
  }

  if (!isOrganizer) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Organizers only</Text>
        <Text style={styles.emptyBody}>
          Only the person who created this event can manage its attendees.
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryBtn, { marginTop: 18 }]}>
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
            {event.title}
          </Text>
          <Text style={styles.headerMeta}>
            {formatEventDate(event)} • {formatEventTime(event)} · {capacityLabel}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {ended && (
          <Pressable
            style={[styles.primaryBtn, styles.rateBtn]}
            onPress={() =>
              router.push({ pathname: '/post_event_rating', params: { eventId: String(event.id) } })
            }
          >
            <Star size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Rate your attendees</Text>
          </Pressable>
        )}

        {SECTIONS.map((section) => {
          const rows = grouped[section.key];
          if (section.key === 'declined' && rows.length === 0) return null;

          return (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <section.Icon size={16} color="#4b5563" />
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{rows.length}</Text>
                </View>
              </View>

              {rows.length === 0 ? (
                <Text style={styles.emptyRow}>{section.emptyText}</Text>
              ) : (
                rows.map((participant, index) => (
                  <View key={participant.uid} style={styles.row}>
                    <View style={styles.rowAvatar}>
                      <Text style={{ fontSize: 18 }}>{participant.avatar || '👤'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{participant.name}</Text>
                      <Text style={styles.rowMeta}>
                        {section.key === 'waitlisted'
                          ? `Position ${index + 1} in queue`
                          : participant.paymentStatus === 'pending'
                          ? 'Payment pending'
                          : participant.paymentStatus === 'completed'
                          ? 'Paid'
                          : 'Free entry'}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() =>
                          router.push({ pathname: '/chats', params: { otherUserId: participant.uid } })
                        }
                        style={styles.ghostBtn}
                        hitSlop={6}
                      >
                        <MessageCircle size={16} color="#4b5563" />
                      </Pressable>

                      {pendingUid === participant.uid ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                      ) : (
                        <>
                          {(section.key === 'pending' || section.key === 'waitlisted') && (
                            <Pressable
                              onPress={() => act(participant, 'approve')}
                              style={[styles.actionBtn, styles.approveBtn]}
                              hitSlop={6}
                            >
                              <Check size={16} color="#fff" />
                            </Pressable>
                          )}
                          {section.key !== 'declined' && (
                            <Pressable
                              onPress={() => confirmDecline(participant)}
                              style={[styles.actionBtn, styles.declineBtn]}
                              hitSlop={6}
                            >
                              <X size={16} color="#fff" />
                            </Pressable>
                          )}
                          {section.key === 'declined' && (
                            <Pressable
                              onPress={() => act(participant, 'approve')}
                              style={[styles.actionBtn, styles.approveBtn]}
                              hitSlop={6}
                            >
                              <Check size={16} color="#fff" />
                            </Pressable>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: { padding: 6, borderRadius: 999 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },

  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  countBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
  emptyRow: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  ghostBtn: { padding: 8, borderRadius: 999, backgroundColor: '#f3f4f6' },
  actionBtn: { padding: 8, borderRadius: 999 },
  approveBtn: { backgroundColor: '#16a34a' },
  declineBtn: { backgroundColor: '#dc2626' },

  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtn: { marginBottom: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
