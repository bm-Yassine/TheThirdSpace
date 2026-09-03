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
  CreditCard,
  Pencil,
  Ban,
  RotateCcw,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'react-native';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { formatEventDate, formatEventTime, hasEventEnded } from '../lib/eventTime';
import { invalidateEventFeedCache } from '../lib/eventFeed';
import type { Attendee } from '../lib/types';
import { isAwaitingPayment } from '../lib/participation';
import Avatar from '../components/Avatar';

type SectionKey = 'pending' | 'unpaid' | 'confirmed' | 'waitlisted' | 'declined';

type Section = {
  key: SectionKey;
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
  {
    key: 'unpaid',
    title: 'Awaiting payment',
    emptyText: '',
    Icon: CreditCard,
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
  const [busy, setBusy] = useState(false);

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
    const buckets: Record<SectionKey, Attendee[]> = {
      pending: [],
      unpaid: [],
      confirmed: [],
      waitlisted: [],
      declined: [],
    };

    participants.forEach((participant) => {
      // `pending` covers two different situations. Someone who simply has not
      // paid yet is not an approval decision for the organizer to make, so it
      // gets its own bucket with no approve action.
      const key: SectionKey = isAwaitingPayment(participant)
        ? 'unpaid'
        : (participant.status as SectionKey);

      buckets[key]?.push(participant);
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

  const isCancelled = event?.status === 'cancelled';

  const onCancelEvent = () => {
    const headcount = grouped.confirmed.length + grouped.pending.length + grouped.waitlisted.length;
    Alert.alert(
      'Cancel this event?',
      headcount > 0
        ? `${headcount} ${headcount === 1 ? 'person' : 'people'} will be messaged to let them know. The event stays in everyone's history but disappears from Discover.`
        : "The event will disappear from Discover. You can reopen it later.",
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel event',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await dataService.cancelEvent(eventId);
              invalidateEventFeedCache();
              await loadEvent();
              Alert.alert(
                'Event cancelled',
                result.notified > 0
                  ? `${result.notified} ${result.notified === 1 ? 'person has' : 'people have'} been messaged.`
                  : 'Nobody had joined, so no messages were sent.'
              );
            } catch (error: any) {
              Alert.alert('Could not cancel', error?.message || 'Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const onReopenEvent = async () => {
    setBusy(true);
    try {
      await dataService.reopenEvent(eventId);
      invalidateEventFeedCache();
      await loadEvent();
    } catch (error: any) {
      Alert.alert('Could not reopen', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
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
        <ActivityIndicator size="large" color="#6366f1" />
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
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Ban size={18} color="#b91c1c" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>This event is cancelled</Text>
              <Text style={styles.cancelledBody}>
                It no longer appears in Discover. Reopen it to make it joinable again.
              </Text>
            </View>
          </View>
        )}

        {ended && !isCancelled && (
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

        {!ended && (
          <View style={styles.organizerActions}>
            <Pressable
              style={[styles.secondaryBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() =>
                router.push({ pathname: '/create', params: { eventId: String(event.id) } })
              }
            >
              <Pencil size={15} color="#374151" />
              <Text style={styles.secondaryBtnText}>Edit details</Text>
            </Pressable>

            {isCancelled ? (
              <Pressable
                style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={onReopenEvent}
              >
                <RotateCcw size={15} color="#15803d" />
                <Text style={[styles.secondaryBtnText, { color: '#15803d' }]}>Reopen</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.secondaryBtn, styles.dangerBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={onCancelEvent}
              >
                <Ban size={15} color="#dc2626" />
                <Text style={[styles.secondaryBtnText, { color: '#dc2626' }]}>Cancel event</Text>
              </Pressable>
            )}
          </View>
        )}

        {SECTIONS.map((section) => {
          const rows = grouped[section.key];
          if ((section.key === 'declined' || section.key === 'unpaid') && rows.length === 0) {
            return null;
          }

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
                    <Avatar
                      uid={participant.uid}
                      name={participant.name}
                      photoURL={participant.photoURL}
                      size={40}
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{participant.name}</Text>
                      <Text style={styles.rowMeta}>
                        {section.key === 'waitlisted'
                          ? `Position ${index + 1} in queue`
                          : section.key === 'unpaid'
                          ? 'Has not completed payment'
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
                              <X size={16} color="#dc2626" />
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
    paddingTop: 16,
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
  declineBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

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

  organizerActions: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  dangerBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  btnDisabled: { opacity: 0.5 },

  cancelledBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 13,
    marginBottom: 18,
  },
  cancelledTitle: { fontSize: 14, fontWeight: '700', color: '#b91c1c' },
  cancelledBody: { fontSize: 12, color: '#b91c1c', marginTop: 2, lineHeight: 17 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
