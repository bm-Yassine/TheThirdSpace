import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Settings,
  Star,
  Clock,
  Ban,
  Flag,
  Share2,
} from 'lucide-react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'react-native';
import { dataService, type UserCommitment } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import {
  formatEventDate,
  formatEventTimeRange,
  formatRelativeToNow,
  hasEventEnded,
} from '../lib/eventTime';
import { invalidateEventFeedCache } from '../lib/eventFeed';
import { confirmCheckout } from '../lib/payments';
import ReportDialog from '../components/ReportDialog';
import Avatar from '../components/Avatar';
import AttendeeStrip from '../components/AttendeeStrip';
import { shareEvent } from '../lib/share';

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');
  const paymentParam = String(params.payment || '');
  const sessionIdParam = String(params.session_id || '');
  const { user, initializing } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState<any | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [commitment, setCommitment] = useState<UserCommitment | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [settlingPayment, setSettlingPayment] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const isLoggedIn = !!user;

  const load = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      setLoading(false);
      return;
    }

    try {
      const eventData: any = await dataService.getEvent(eventId);
      setEvent(eventData || null);

      if (eventData && user) {
        const [favorite, commitmentData, rated] = await Promise.all([
          dataService.isFavorite(eventId),
          dataService.getUserCommitment(eventId),
          dataService.hasRatedEvent(eventId),
        ]);
        setIsFavorite(favorite);
        setCommitment(commitmentData);
        setHasRated(rated);
      } else {
        setIsFavorite(false);
        setCommitment(null);
        setHasRated(false);
      }
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  // Reloads on every focus so returning from payment or the manage screen
  // reflects the new state instead of showing a stale banner.
  useFocusEffect(
    useCallback(() => {
      if (initializing) return;
      load();
    }, [initializing, load])
  );

  // Stripe redirects back here after checkout. The webhook is authoritative,
  // but confirming directly removes the visible lag before the banner updates.
  useEffect(() => {
    if (initializing || !user) return;
    if (paymentParam !== 'success' || !sessionIdParam) return;

    let active = true;
    setSettlingPayment(true);
    confirmCheckout(sessionIdParam)
      .then(async (result) => {
        if (!active) return;
        if (result.paid) {
          invalidateEventFeedCache();
          await load();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSettlingPayment(false);
      });

    return () => {
      active = false;
    };
  }, [initializing, user, paymentParam, sessionIdParam, load]);

  const isOrganizer = !!user && !!event && event.createdBy === user.uid;
  const ended = !!event && hasEventEnded(event);
  const isCancelled = event?.status === 'cancelled';
  const spotsLeft = useMemo(() => {
    if (!event?.maxAttendees) return null;
    return Math.max(Number(event.maxAttendees) - Number(event.attendees || 0), 0);
  }, [event]);

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const requireLogin = () => {
    Alert.alert('Sign in required', 'Please sign in to interact with events.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/login') },
    ]);
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn || !event) return requireLogin();

    // Optimistic: the heart should never lag behind the tap.
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) await dataService.addToFavorites(String(event.id));
      else await dataService.removeFromFavorites(String(event.id));
    } catch {
      setIsFavorite(!next);
      Alert.alert('Error', 'Could not update your favorites right now.');
    }
  };

  const goToPayment = () => {
    router.push({
      pathname: '/payment',
      params: { eventId: String(event.id), amount: String(event.cost), title: event.title },
    });
  };

  const onPrimaryPress = async () => {
    if (!isLoggedIn || !event) return requireLogin();

    if (isCancelled && !commitment) {
      return Alert.alert('Event cancelled', 'This event is no longer taking part.');
    }

    // Outstanding payment always takes priority over any other action.
    if (commitment && commitment.paymentStatus === 'pending' && Number(event.cost) > 0) {
      return goToPayment();
    }

    if (commitment) {
      const label = commitment.status === 'confirmed' ? 'Leave this event?' : 'Withdraw your request?';
      Alert.alert(label, 'You can join again later if there is still room.', [
        { text: 'Keep my spot', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await dataService.leaveEvent(String(event.id));
              setCommitment(null);
              invalidateEventFeedCache();
              await load();
            } catch {
              Alert.alert('Error', 'Could not cancel right now.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
      return;
    }

    if (Number(event.cost) > 0) return goToPayment();

    setBusy(true);
    try {
      const result = await dataService.joinEvent(String(event.id));
      setCommitment({
        eventId: String(event.id),
        status: result.status,
        reason: result.reason,
        committedAt: new Date(),
      });
      invalidateEventFeedCache();
      await load();
    } catch (error: any) {
      Alert.alert('Could not join', error?.message || 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const onMessageOrganizer = () => {
    if (!isLoggedIn) return requireLogin();
    const organizerUid = event?.createdBy || event?.organizer?.uid;
    if (!organizerUid) {
      return Alert.alert('Unavailable', 'This organizer cannot be messaged yet.');
    }
    router.push({ pathname: '/chats', params: { otherUserId: organizerUid } });
  };

  if (initializing || loading || settlingPayment) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.title}>Event not found</Text>
        <Pressable onPress={() => router.replace('/home')} style={[styles.btn, styles.btnBlack, { marginTop: 16 }]}>
          <Text style={styles.btnText}>Back to Discover</Text>
        </Pressable>
      </View>
    );
  }

  const banner = buildBanner({ commitment, ended, isOrganizer, event });

  const primaryLabel = (() => {
    if (!isLoggedIn) return 'Sign In to Join';
    if (isOrganizer) return 'Manage Attendees';
    if (isCancelled) return commitment ? 'Remove from my list' : 'Event cancelled';
    if (ended) return 'This event has ended';
    if (commitment?.paymentStatus === 'pending' && Number(event.cost) > 0) {
      return `Complete Payment · ${formatCurrency(Number(event.cost))}`;
    }
    if (commitment) {
      if (commitment.status === 'confirmed') return 'Leave Event';
      if (commitment.status === 'waitlisted') return 'Leave Waitlist';
      return 'Withdraw Request';
    }
    if (Number(event.cost) > 0) return `Join · ${formatCurrency(Number(event.cost))}`;
    if (spotsLeft === 0) return 'Join Waitlist';
    if (event.requiresApproval) return 'Request to Join';
    return 'Join Event';
  })();

  const primaryAction = isOrganizer
    ? () => router.push({ pathname: '/manage_event', params: { eventId: String(event.id) } })
    : onPrimaryPress;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isOrganizer && (
            <Pressable
              onPress={() => router.push({ pathname: '/manage_event', params: { eventId: String(event.id) } })}
              style={[styles.iconBtn, styles.iconBtnNeutral]}
              hitSlop={8}
            >
              <Settings size={20} color="#374151" />
            </Pressable>
          )}
          <Pressable
            onPress={async () => {
              const outcome = await shareEvent(event);
              if (outcome === 'copied') {
                Alert.alert('Link copied', 'Paste it wherever you like.');
              } else if (outcome === 'failed') {
                Alert.alert('Could not share', 'Please try again.');
              }
            }}
            style={[styles.iconBtn, styles.iconBtnNeutral]}
            hitSlop={8}
          >
            <Share2 size={19} color="#374151" />
          </Pressable>

          <Pressable
            onPress={toggleFavorite}
            style={[styles.iconBtn, isFavorite ? styles.heartActive : styles.heartIdle]}
            hitSlop={8}
          >
            <Heart
              size={20}
              color={isFavorite ? '#dc2626' : '#9ca3af'}
              fill={isFavorite ? '#dc2626' : 'none'}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={styles.title}>{event.title || 'Untitled Event'}</Text>

        {paymentParam === 'cancelled' && !commitment?.paymentStatus && (
          <View style={[styles.bannerBase, styles.bannerOrange]}>
            <AlertCircle size={20} color="#111827" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Checkout cancelled</Text>
              <Text style={styles.bannerDesc}>No payment was taken. You can try again below.</Text>
            </View>
          </View>
        )}

        {banner && (
          <View style={[styles.bannerBase, banner.style]}>
            <banner.Icon size={20} color="#111827" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerDesc}>{banner.desc}</Text>
            </View>
          </View>
        )}

        {ended && !hasRated && (commitment?.status === 'confirmed' || isOrganizer) && (
          <Pressable
            style={[styles.btn, styles.btnIndigo, { marginBottom: 14 }]}
            onPress={() =>
              router.push({ pathname: '/post_event_rating', params: { eventId: String(event.id) } })
            }
          >
            <Star size={16} color="#fff" />
            <Text style={styles.btnText}>
              {isOrganizer ? 'Rate your attendees' : 'Rate the organizer'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/organizer_info',
              params: {
                organizerName: event.organizer?.name || '',
                organizerUid: event.createdBy || event.organizer?.uid || '',
              },
            })
          }
          style={styles.orgRow}
        >
          <Avatar
            uid={event.createdBy || event.organizer?.uid}
            name={event.organizer?.name}
            photoURL={event.organizer?.photoURL}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.orgName}>{event.organizer?.name || 'Unknown Organizer'}</Text>
            <Text style={styles.subtle}>{isOrganizer ? 'You are hosting' : 'Event Organizer'}</Text>
          </View>
          {!isOrganizer && (
            <Pressable onPress={onMessageOrganizer} style={styles.msgBtn} hitSlop={6}>
              <MessageCircle size={18} color="#374151" />
            </Pressable>
          )}
        </Pressable>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.h4}>Description</Text>
          <Text style={styles.body}>
            {event.description?.trim() || 'The organizer has not added a description yet.'}
          </Text>
        </View>

        <View style={{ gap: 12, marginBottom: 18 }}>
          <View style={styles.detailRow}>
            <Calendar size={18} color="#6b7280" />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>Date & Time</Text>
              <Text style={styles.subtle}>
                {formatEventDate(event)} • {formatEventTimeRange(event)}
              </Text>
            </View>
            {!!formatRelativeToNow(event) && (
              <View style={styles.pill}>
                <Clock size={12} color="#4b5563" />
                <Text style={styles.pillText}>{formatRelativeToNow(event)}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color="#6b7280" />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.subtle}>{event.location || 'Location to be announced'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Users size={18} color="#6b7280" />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>Attendees</Text>
              <Text style={styles.subtle}>
                {Number(event.attendees || 0)}
                {event.maxAttendees ? ` of ${event.maxAttendees}` : ''} going
                {spotsLeft !== null && spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : ''}
                {spotsLeft === 0 ? ' · full' : ''}
              </Text>
              {isOrganizer && Number(event.pendingCount || 0) > 0 && (
                <Text style={styles.pendingHint}>
                  {event.pendingCount} request{Number(event.pendingCount) === 1 ? '' : 's'} awaiting your approval
                </Text>
              )}
            </View>
          </View>
        </View>

        {!!event.tags?.length && (
          <View style={[styles.tagsWrap, { marginBottom: 18 }]}>
            {event.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {isLoggedIn && (
          <AttendeeStrip
            eventId={String(event.id)}
            totalGoing={Number(event.attendees || 0)}
            onMessage={(uid, name) => {
              if (uid === user?.uid) return;
              Alert.alert(name, 'Send them a message?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Message',
                  onPress: () => router.push({ pathname: '/chats', params: { otherUserId: uid } }),
                },
              ]);
            }}
          />
        )}

        {!isOrganizer && isLoggedIn && (
          <View style={styles.safetyRow}>
            <Pressable
              onPress={() => setShowReport(true)}
              style={styles.safetyBtn}
              hitSlop={6}
            >
              <Flag size={13} color="#6b7280" />
              <Text style={styles.safetyText}>Report</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const organizerUid = event.createdBy || event.organizer?.uid;
                if (!organizerUid) return;
                Alert.alert(
                  `Block ${event.organizer?.name || 'this organizer'}?`,
                  'They will no longer be able to message you, and their events will be hidden from your feed.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Block',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await dataService.blockUser(organizerUid);
                          invalidateEventFeedCache();
                          Alert.alert('Blocked', 'You will no longer see or hear from them.');
                          router.replace('/home');
                        } catch {
                          Alert.alert('Error', 'Could not block right now.');
                        }
                      },
                    },
                  ]
                );
              }}
              style={styles.safetyBtn}
              hitSlop={6}
            >
              <Ban size={13} color="#6b7280" />
              <Text style={styles.safetyText}>Block organizer</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={primaryAction}
          disabled={busy || ((ended || (isCancelled && !commitment)) && !isOrganizer)}
          style={[
            styles.btn,
            isOrganizer
              ? styles.btnIndigo
              : ended || isCancelled
              ? styles.btnGray
              : commitment
              ? styles.btnRed
              : styles.btnBlack,
            (busy || ((ended || (isCancelled && !commitment)) && !isOrganizer)) && styles.btnDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{primaryLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
      <ReportDialog
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetType="event"
        targetId={String(event.id)}
        targetLabel={event.title}
      />
    </View>
  );
}

/** Chooses the status banner shown above the fold. */
function buildBanner({
  commitment,
  ended,
  isOrganizer,
  event,
}: {
  commitment: UserCommitment | null;
  ended: boolean;
  isOrganizer: boolean;
  event: any;
}) {
  // A cancellation is the most important thing on the screen — it outranks
  // "you're going", which would otherwise still be showing.
  if (event?.status === 'cancelled') {
    return {
      Icon: Ban,
      title: 'This event was cancelled',
      desc: event.cancellationReason
        ? `The organizer said: ${event.cancellationReason}`
        : 'The organizer called it off. You have not been charged.',
      style: styles.bannerRed,
    };
  }

  if (isOrganizer) {
    const pending = Number(event.pendingCount || 0);
    return {
      Icon: Settings,
      title: 'You are the organizer',
      desc: pending
        ? `${pending} ${pending === 1 ? 'person is' : 'people are'} waiting for your approval.`
        : 'Manage attendees, approvals and the waitlist from here.',
      style: styles.bannerIndigo,
    };
  }

  if (ended && commitment?.status === 'confirmed') {
    return {
      Icon: CheckCircle,
      title: 'You attended this event',
      desc: 'Share how it went by rating the organizer.',
      style: styles.bannerGreen,
    };
  }

  if (!commitment) return null;

  if (commitment.paymentStatus === 'pending' && Number(event.cost) > 0) {
    return {
      Icon: AlertCircle,
      title: 'Payment required',
      desc: 'Your spot is held until payment completes.',
      style: styles.bannerOrange,
    };
  }

  if (commitment.status === 'confirmed') {
    return {
      Icon: CheckCircle,
      title: "You're going!",
      desc: 'Your spot is confirmed. See you there.',
      style: styles.bannerGreen,
    };
  }

  if (commitment.status === 'waitlisted') {
    return {
      Icon: AlertCircle,
      title: 'On the waitlist',
      desc: "You'll be moved in automatically if a spot opens up.",
      style: styles.bannerOrange,
    };
  }

  if (commitment.status === 'declined') {
    return {
      Icon: AlertCircle,
      title: 'Request declined',
      desc: 'The organizer could not fit you in this time.',
      style: styles.bannerRed,
    };
  }

  return {
    Icon: AlertCircle,
    title: 'Pending approval',
    desc: 'The organizer will review your request shortly.',
    style: styles.bannerBlue,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 8, borderRadius: 999 },
  iconBtnNeutral: { backgroundColor: '#f3f4f6' },
  heartIdle: { backgroundColor: '#f3f4f6' },
  heartActive: { backgroundColor: '#fee2e2' },

  title: { textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#111827', marginVertical: 12 },

  bannerBase: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bannerDesc: { fontSize: 13, color: '#374151', marginTop: 2 },
  bannerOrange: { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
  bannerBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  bannerGreen: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  bannerRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  bannerIndigo: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },

  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  orgAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  msgBtn: { padding: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },

  h4: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  body: { fontSize: 14, color: '#374151', lineHeight: 20 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTitle: { fontSize: 13, color: '#111827', fontWeight: '600' },
  subtle: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  pendingHint: { fontSize: 12, color: '#4f46e5', fontWeight: '600', marginTop: 3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, color: '#4b5563', fontWeight: '600' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, color: '#374151' },

  btn: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnBlack: { backgroundColor: '#111827' },
  btnIndigo: { backgroundColor: '#4f46e5' },
  btnGray: { backgroundColor: '#9ca3af' },
  btnRed: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.6 },

  safetyRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 14 },
  safetyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  safetyText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});
