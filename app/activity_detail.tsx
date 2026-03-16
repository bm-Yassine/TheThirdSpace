import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authService, dataService, type UserCommitment } from '../Backend/firebase';

type Organizer = { uid?: string; name: string; avatar?: string };

type Activity = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  cost: number;
  requiresApproval?: boolean;
  organizer: Organizer;
  tags?: string[];
};

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [commitment, setCommitment] = useState<UserCommitment | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) {
        setActivity(null);
        setLoading(false);
        return;
      }

      try {
        const eventData: any = await dataService.getEvent(eventId);
        if (!eventData) {
          setActivity(null);
          return;
        }

        setActivity({
          id: String(eventData.id || eventId),
          title: eventData.title || 'Untitled Event',
          date: eventData.date || '',
          time: eventData.time || '',
          location: eventData.location || '',
          attendees: Number(eventData.attendees || 0),
          maxAttendees: Number(eventData.maxAttendees || 0),
          cost: Number(eventData.cost || 0),
          requiresApproval: !!eventData.requiresApproval,
          organizer: {
            uid: eventData.organizer?.uid || eventData.createdBy,
            name: eventData.organizer?.name || 'Unknown Organizer',
            avatar: eventData.organizer?.avatar || '👤',
          },
          tags: eventData.tags || [],
        });

        const user = authService.getCurrentUser();
        setIsLoggedIn(!!user);
        if (user) {
          const [favorite, commitmentData] = await Promise.all([
            dataService.isFavorite(eventId),
            dataService.getUserCommitment(eventId),
          ]);
          setIsFavorite(favorite);
          setCommitment(commitmentData);
        }
      } catch {
        setActivity(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const organizer = useMemo<Organizer>(
    () => activity?.organizer || { name: 'Unknown Organizer', avatar: '👤' },
    [activity]
  );

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const requireLogin = () => {
    Alert.alert('Login Required', 'Please sign in to interact with events.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/login') },
    ]);
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn || !activity) return requireLogin();
    try {
      if (isFavorite) {
        await dataService.removeFromFavorites(activity.id);
        setIsFavorite(false);
      } else {
        await dataService.addToFavorites(activity.id);
        setIsFavorite(true);
      }
    } catch {
      Alert.alert('Error', 'Could not update favorite right now.');
    }
  };

  const onCommitPress = async () => {
    if (!isLoggedIn || !activity) return requireLogin();

    if (commitment) {
      try {
        await dataService.cancelCommitment(activity.id);
        setCommitment(null);
      } catch {
        Alert.alert('Error', 'Could not cancel right now.');
      }
      return;
    }

    if (activity.cost > 0) {
      router.push({
        pathname: './payment',
        params: { eventId: activity.id, amount: String(activity.cost), title: activity.title },
      });
      return;
    }

    try {
      const result = await dataService.commitToEvent(activity.id);
      setCommitment({
        eventId: activity.id,
        status: result.status,
        reason: result.reason,
        committedAt: new Date(),
      });
    } catch {
      Alert.alert('Error', 'Could not join this event right now.');
    }
  };

  const onOrganizerPress = () => {
    if (!activity) return;
    router.push({
      pathname: './organizer_info',
      params: {
        organizerName: activity.organizer.name,
        organizerUid: activity.organizer.uid || '',
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>Event not found</Text>
      </View>
    );
  }

  const banner =
    commitment?.status === 'approved'
      ? {
          Icon: CheckCircle,
          title: "You're Going!",
          desc: 'Your spot is confirmed. See you there!',
          style: styles.bannerGreen,
        }
      : commitment?.status === 'pending'
      ? {
          Icon: AlertCircle,
          title: commitment.reason === 'waitlist' ? 'On Waitlist' : 'Pending Approval',
          desc:
            commitment.reason === 'waitlist'
              ? "You're on the waitlist. We'll notify you if a spot opens up."
              : 'The organizer will review your request and get back to you soon.',
          style: commitment.reason === 'waitlist' ? styles.bannerOrange : styles.bannerBlue,
        }
      : null;

  const buttonText = !isLoggedIn
    ? 'Sign In to Join'
    : commitment
    ? commitment.status === 'approved'
      ? 'Cancel Registration'
      : 'Cancel Request'
    : activity.cost > 0
    ? `Join Activity - ${formatCurrency(activity.cost)}`
    : activity.requiresApproval
    ? 'Request to Join'
    : activity.maxAttendees > 0 && activity.attendees >= activity.maxAttendees
    ? 'Join Waitlist'
    : 'Join Activity';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <Pressable
          onPress={toggleFavorite}
          style={[styles.iconBtn, isFavorite ? styles.heartActive : styles.heartIdle]}
        >
          <Heart size={20} color={isFavorite ? '#dc2626' : '#9ca3af'} fill={isFavorite ? '#dc2626' : 'none'} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={styles.title}>{activity.title}</Text>

        {banner && (
          <View style={[styles.bannerBase, banner.style]}>
            <banner.Icon size={20} color="#111827" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerDesc}>{banner.desc}</Text>
            </View>
          </View>
        )}

        <Pressable onPress={onOrganizerPress} style={styles.orgRow}>
          <View style={styles.orgAvatar}>
            <Text style={{ fontSize: 20 }}>{organizer.avatar || '👤'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orgName}>{organizer.name}</Text>
            <Text style={styles.subtle}>Event Organizer</Text>
          </View>
        </Pressable>

        <View style={{ marginBottom: 14 }}>
          <Text style={styles.h4}>Description</Text>
          <Text style={styles.body}>Join us for an amazing {activity.title.toLowerCase()}! All skill levels welcome.</Text>
        </View>

        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={styles.detailRow}>
            <Calendar size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Date & Time</Text>
              <Text style={styles.subtle}>{activity.date} • {activity.time}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.subtle}>{activity.location}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Users size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Attendees</Text>
              <Text style={styles.subtle}>{activity.attendees} of {activity.maxAttendees} people</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={onCommitPress} style={[styles.btn, commitment?.status === 'approved' ? styles.btnRed : styles.btnBlack]}>
          <Text style={styles.btnText}>{buttonText}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconBtn: { padding: 8, borderRadius: 999 },
  heartIdle: { backgroundColor: '#f3f4f6' },
  heartActive: { backgroundColor: '#fee2e2' },

  title: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#111827', marginVertical: 12 },

  bannerBase: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bannerDesc: { fontSize: 13, color: '#374151', marginTop: 2 },
  bannerCancel: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#00000022', backgroundColor: '#ffffffaa' },
  bannerCancelText: { fontSize: 12, color: '#111827' },
  bannerYellow: { backgroundColor: '#fef9c3', borderColor: '#fde68a' },
  bannerOrange: { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
  bannerBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  bannerGreen: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },

  orgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 10, marginBottom: 12,
  },
  orgAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  orgName: { fontSize: 15, fontWeight: '600', color: '#111827' },

  h4: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  h5: { fontSize: 14, fontWeight: '600', color: '#111827' },
  body: { fontSize: 13, color: '#374151', lineHeight: 18 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTitle: { fontSize: 13, color: '#111827', fontWeight: '600' },
  coinBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  subtle: { fontSize: 12, color: '#6b7280' },

  infoBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, marginBottom: 16 },
  infoText: { fontSize: 12, color: '#374151', lineHeight: 18 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, color: '#374151' },

  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnBlack: { backgroundColor: '#111827' },
  btnBlue: { backgroundColor: '#2563eb' },
  btnGray: { backgroundColor: '#6b7280' },
  btnRed: { backgroundColor: '#dc2626' },
});
