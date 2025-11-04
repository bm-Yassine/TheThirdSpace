import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
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

type Organizer = { name: string; avatar?: string };
type CommitmentStatus = 'pending' | 'approved' | null;

export type Activity = {
  id?: number | string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  cost: number;
  isFavorite?: boolean;
  isCommitted?: boolean;
  commitmentStatus?: CommitmentStatus; // 'pending' or 'approved'
  requiresApproval?: boolean;
  organizer?: Organizer;
  tags?: string[];
};

type Props = {
  activity: Activity | null;
  onBack?: () => void;
  onOrganizerClick?: (org: Organizer) => void;
  onNavigate?: (screen: string) => void; // 'organizer-info'
  onCommitToActivity?: (activity: Activity) => void; // e.g., open PaymentSheet or trigger commit
};

export default function ActivityDetailScreen({
  activity,
  onBack,
  onOrganizerClick,
  onNavigate,
  onCommitToActivity,
}: Props) {
  const [isFavorite, setIsFavorite] = useState<boolean>(!!activity?.isFavorite);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(activity || null);

  if (!currentActivity) return null;

  const organizer: Organizer = useMemo(
    () => currentActivity.organizer || { name: 'Unknown Organizer', avatar: '👤' },
    [currentActivity.organizer]
  );

  const handleOrganizerClick = () => {
    if (currentActivity.organizer) {
      onOrganizerClick?.(currentActivity.organizer);
      onNavigate?.('organizer-info');
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const getCommitmentBanner = () => {
    if (currentActivity.isCommitted && currentActivity.commitmentStatus === 'pending') {
      if (currentActivity.cost > 0) {
        return {
          Icon: AlertCircle,
          title: 'Payment Required',
          desc: `Complete payment of ${formatCurrency(currentActivity.cost)} to confirm your spot`,
          style: styles.bannerYellow,
          canCancel: false,
        };
      } else if (currentActivity.attendees >= currentActivity.maxAttendees) {
        return {
          Icon: AlertCircle,
          title: 'On Waitlist',
          desc: "You're on the waitlist. We'll notify you if a spot opens up.",
          style: styles.bannerOrange,
          canCancel: true,
        };
      } else if (currentActivity.requiresApproval) {
        return {
          Icon: AlertCircle,
          title: 'Pending Approval',
          desc: 'The organizer will review your request and get back to you soon.',
          style: styles.bannerBlue,
          canCancel: true,
        };
      }
    } else if (currentActivity.isCommitted && currentActivity.commitmentStatus === 'approved') {
      return {
        Icon: CheckCircle,
        title: "You're Going!",
        desc: 'Your spot is confirmed. See you there!',
        style: styles.bannerGreen,
        canCancel: true,
      };
    }
    return null;
  };

  const banner = getCommitmentBanner();
  const shouldShowHeart = !currentActivity.isCommitted;

  const handleCommitClick = () => {
    if (currentActivity.isCommitted) {
      if (currentActivity.commitmentStatus === 'pending' && currentActivity.cost === 0) {
        // cancel pending (free)
        setCurrentActivity({ ...currentActivity, isCommitted: false, commitmentStatus: null });
        return;
      }
      if (currentActivity.commitmentStatus === 'approved') {
        // cancel approved
        setCurrentActivity({ ...currentActivity, isCommitted: false, commitmentStatus: null });
        return;
      }
      if (currentActivity.cost > 0 && currentActivity.commitmentStatus === 'pending') {
        // complete payment
        onCommitToActivity?.(currentActivity);
        return;
      }
    }

    // new commitment
    if (currentActivity.cost > 0 && !currentActivity.isCommitted) {
      onCommitToActivity?.(currentActivity); // e.g., open your PaymentScreen modal
    } else {
      // free event path (could set pending/approved based on requiresApproval or capacity)
      setCurrentActivity({ ...currentActivity, isCommitted: true, commitmentStatus: currentActivity.requiresApproval ? 'pending' : 'approved' });
    }
  };

  const getActionButtonText = () => {
    if (currentActivity.isCommitted) {
      if (currentActivity.commitmentStatus === 'approved') return 'Cancel Registration';
      if (currentActivity.commitmentStatus === 'pending') {
        if (currentActivity.cost > 0) return 'Complete Payment';
        if (currentActivity.requiresApproval) return 'Cancel Request (Pending Approval)';
        return 'Cancel Request';
      }
    } else if (currentActivity.attendees >= currentActivity.maxAttendees) {
      return 'Join Waitlist';
    } else if (currentActivity.requiresApproval) {
      return 'Request to Join (Requires Approval)';
    } else if (currentActivity.cost > 0) {
      return `Join Activity - ${formatCurrency(currentActivity.cost)}`;
    }
    return 'Join Activity';
  };

  const getActionButtonStyle = () => {
    if (currentActivity.isCommitted && currentActivity.commitmentStatus === 'approved') {
      return styles.btnRed;
    }
    if (currentActivity.isCommitted && currentActivity.commitmentStatus === 'pending') {
      return currentActivity.requiresApproval ? styles.btnBlue : styles.btnGray;
    }
    return styles.btnBlack;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.iconBtn} android_ripple={{ color: '#e5e7eb', borderless: true }}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>

        {shouldShowHeart && (
          <Pressable
            onPress={() => setIsFavorite((v) => !v)}
            style={[styles.iconBtn, isFavorite ? styles.heartActive : styles.heartIdle]}
            android_ripple={{ color: '#fecaca' }}
          >
            <Heart size={20} color={isFavorite ? '#dc2626' : '#9ca3af'} fill={isFavorite ? '#dc2626' : 'none'} />
          </Pressable>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{currentActivity.title}</Text>

        {/* Commitment banner */}
        {banner && (
          <View style={[styles.bannerBase, banner.style]}>
            <banner.Icon size={20} color={banner === null ? '#6b7280' : '#111827'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerDesc}>{banner.desc}</Text>
            </View>
            {banner.canCancel && (
              <Pressable onPress={handleCommitClick} style={styles.bannerCancel} android_ripple={{ color: '#ffffff55' }}>
                <Text style={styles.bannerCancelText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Organizer */}
        {currentActivity.organizer && (
          <Pressable onPress={handleOrganizerClick} style={styles.orgRow} android_ripple={{ color: '#f1f5f9' }}>
            <View style={styles.orgAvatar}>
              <Text style={{ fontSize: 20 }}>{organizer.avatar || '👤'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orgName}>{organizer.name}</Text>
              <Text style={styles.subtle}>Event Organizer</Text>
            </View>
          </Pressable>
        )}

        {/* Description */}
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.h4}>Description</Text>
          <Text style={styles.body}>
            Join us for an amazing {currentActivity.title.toLowerCase()}! This is a great opportunity to meet
            like-minded people and enjoy a wonderful experience together. All skill levels are welcome.
          </Text>
        </View>

        {/* Details */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={styles.detailRow}>
            <Calendar size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Date & Time</Text>
              <Text style={styles.subtle}>{currentActivity.date} • {currentActivity.time}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.subtle}>{currentActivity.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Users size={18} color="#6b7280" />
            <View>
              <Text style={styles.detailTitle}>Attendees</Text>
              <Text style={styles.subtle}>
                {currentActivity.attendees} of {currentActivity.maxAttendees} people
                {currentActivity.attendees >= currentActivity.maxAttendees && <Text style={{ color: '#ea580c' }}> (Full)</Text>}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.coinBox}><Text style={{ color: '#6b7280' }}>💰</Text></View>
            <View>
              <Text style={styles.detailTitle}>Cost</Text>
              <Text style={styles.subtle}>
                {currentActivity.cost > 0 ? formatCurrency(currentActivity.cost) : 'Free'}
              </Text>
            </View>
          </View>
        </View>

        {/* Important Info */}
        {(currentActivity.cost > 0 || currentActivity.attendees >= currentActivity.maxAttendees) && (
          <View style={styles.infoBox}>
            <Text style={styles.h5}>Important Information</Text>
            <View style={{ marginTop: 4 }}>
              {currentActivity.cost > 0 && <Text style={styles.infoText}>• Payment is required to secure your spot</Text>}
              {currentActivity.attendees >= currentActivity.maxAttendees && <Text style={styles.infoText}>• This event is currently full — join the waitlist</Text>}
            </View>
          </View>
        )}

        {/* Tags */}
        {!!currentActivity.tags?.length && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.h4}>Tags</Text>
            <View style={styles.tagsWrap}>
              {currentActivity.tags.map((t, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action */}
        <Pressable onPress={handleCommitClick} style={[styles.btn, getActionButtonStyle()]} android_ripple={{ color: '#ffffff22' }}>
          <Text style={styles.btnText}>{getActionButtonText()}</Text>
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

  // Banner styles
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

  // Organizer
  orgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 10, marginBottom: 12,
  },
  orgAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  orgName: { fontSize: 15, fontWeight: '600', color: '#111827' },

  // Text blocks
  h4: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  h5: { fontSize: 14, fontWeight: '600', color: '#111827' },
  body: { fontSize: 13, color: '#374151', lineHeight: 18 },

  // Details
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTitle: { fontSize: 13, color: '#111827', fontWeight: '600' },
  coinBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },

  // Info
  infoBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, marginBottom: 16 },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, color: '#374151' },

  // Button
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnBlack: { backgroundColor: '#111827' },
  btnBlue: { backgroundColor: '#2563eb' },
  btnGray: { backgroundColor: '#6b7280' },
  btnRed: { backgroundColor: '#dc2626' },
});
