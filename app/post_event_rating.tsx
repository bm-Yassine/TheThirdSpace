// PostEventRatingScreen.tsx — React Native / Expo
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  ArrowLeft,
  Star,
  Users,
  CheckCircle,
} from 'lucide-react-native';

type UserRole = 'organizer' | 'attendee';

type Organizer = { name: string; avatar?: string };
type Person = { id: number; name: string; avatar?: string; role: 'organizer' | 'attendee' };

type EventLite = {
  id?: number | string;
  title?: string;
  organizer?: Organizer | string;
  // In production you’ll likely pass attendees you want the organizer to rate:
  // attendees?: Array<{ id: number; name: string; avatar?: string }>;
};

type QualityOption = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

type RatingsMap = Record<number, QualityOption>;

type Props = {
  event?: EventLite;
  userRole: UserRole; // 'organizer' rates attendees, 'attendee' rates organizer
  onBack?: () => void;
  onComplete?: (ratings: RatingsMap) => void;
};

// ----- Quality banks (from your web file) -----
const topOrganizerQualities: QualityOption[] = [
  { id: 'organized', label: 'Super Organized', emoji: '📋', description: 'Everything was perfectly planned' },
  { id: 'welcoming', label: 'Very Welcoming', emoji: '🤗', description: 'Made everyone feel included' },
  { id: 'energetic', label: 'High Energy', emoji: '⚡', description: 'Brought amazing energy to the event' },
];

const attendeeQualityOptions: QualityOption[] = [
  { id: 'engaged', label: 'Highly Engaged', emoji: '🎯', description: 'Actively participated throughout' },
  { id: 'respectful', label: 'Very Respectful', emoji: '🙏', description: 'Respectful of others and guidelines' },
  { id: 'positive', label: 'Positive Energy', emoji: '😊', description: 'Brought great vibes to the group' },
  { id: 'helpful', label: 'Super Helpful', emoji: '🤝', description: 'Helped others and contributed positively' },
  { id: 'punctual', label: 'Always Punctual', emoji: '⏰', description: 'On time and ready to participate' },
  { id: 'enthusiastic', label: 'Very Enthusiastic', emoji: '🌟', description: 'Showed genuine enthusiasm' },
];

export default function PostEventRatingScreen({
  event,
  userRole,
  onBack,
  onComplete,
}: Props) {
  // In production, replace this with real data from `event.attendees` (if organizer)
  // or simply the organizer identity (if attendee).
  const peopleToRate: Person[] = useMemo(() => {
    if (userRole === 'organizer') {
      return [
        { id: 1, name: 'John Doe', avatar: '👤', role: 'attendee' },
        { id: 2, name: 'Jane Smith', avatar: '👩', role: 'attendee' },
        { id: 3, name: 'Mike Johnson', avatar: '👨', role: 'attendee' },
      ];
    }
    const orgName =
      typeof event?.organizer === 'object'
        ? event?.organizer?.name
        : event?.organizer || 'Event Organizer';
    const orgAvatar =
      typeof event?.organizer === 'object'
        ? event?.organizer?.avatar
        : '👩‍🦰';

    return [
      { id: 101, name: orgName, avatar: orgAvatar, role: 'organizer' },
    ];
  }, [userRole, event]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [selectedQuality, setSelectedQuality] = useState<QualityOption | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const currentPerson = peopleToRate[currentIdx];
  const isLast = currentIdx === peopleToRate.length - 1;
  const progressPct = ((currentIdx + 1) / peopleToRate.length) * 100;

  const options: QualityOption[] =
    currentPerson?.role === 'organizer' ? topOrganizerQualities : attendeeQualityOptions;

  const handleSubmit = () => {
    if (!selectedQuality || !currentPerson) return;

    const next = { ...ratings, [currentPerson.id]: selectedQuality };
    setRatings(next);

    if (isLast) {
      setIsComplete(true);
      // Return results shortly after showing the thank-you screen
      setTimeout(() => onComplete?.(next), 2000);
    } else {
      setCurrentIdx((v) => v + 1);
      setSelectedQuality(null);
    }
  };

  const handleSkip = () => {
    if (isLast) {
      setIsComplete(true);
      setTimeout(() => onComplete?.(ratings), 2000);
    } else {
      setCurrentIdx((v) => v + 1);
      setSelectedQuality(null);
    }
  };

  // ------- Completion screen -------
  if (isComplete) {
    return (
      <View style={[styles.screen, styles.center]}>
        <View style={styles.doneIconWrap}>
          <CheckCircle size={40} color="#16a34a" />
        </View>
        <Text style={styles.h2}>Thank You!</Text>
        <Text style={styles.mutedCenter}>
          Your ratings have been submitted and will help improve future events.
        </Text>
        <Text style={styles.subtleCenter}>Returning to your profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} android_ripple={{ color: '#e5e7eb', borderless: true }}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Rate Your Experience</Text>
          {!!event?.title && <Text style={styles.subtle}>{event.title}</Text>}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressLabel}>
            {currentIdx + 1} of {peopleToRate.length}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Person card */}
        <View style={styles.personWrap}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 28 }}>{currentPerson?.avatar || '🙂'}</Text>
          </View>
          <Text style={styles.h2}>{currentPerson?.name}</Text>
          <View style={styles.roleRow}>
            {currentPerson?.role === 'organizer' ? (
              <>
                <Star size={16} color="#6b7280" />
                <Text style={styles.roleText}>Event Organizer</Text>
              </>
            ) : (
              <>
                <Users size={16} color="#6b7280" />
                <Text style={styles.roleText}>Fellow Attendee</Text>
              </>
            )}
          </View>
        </View>

        {/* Prompt */}
        <View style={{ marginTop: 4, marginBottom: 12 }}>
          <Text style={styles.promptTitle}>
            {currentPerson?.role === 'organizer'
              ? 'How would you describe this organizer?'
              : 'How would you describe this attendee?'}
          </Text>
          <Text style={styles.promptSub}>
            {currentPerson?.role === 'organizer'
              ? 'Choose from the top 3 most common host qualities'
              : 'Choose the quality that best fits your experience'}
          </Text>
        </View>

        {/* Quality options */}
        <View style={{ gap: 10 }}>
          {options.map((opt) => {
            const selected = selectedQuality?.id === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedQuality(opt)}
                style={[
                  styles.optionCard,
                  selected ? styles.optionCardSelected : styles.optionCardIdle,
                ]}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <View style={styles.optionRow}>
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{opt.label}</Text>
                    <Text style={styles.optionDesc}>{opt.description}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={handleSkip} style={[styles.btn, styles.btnOutline]} android_ripple={{ color: '#e5e7eb' }}>
          <Text style={[styles.btnText, styles.btnTextOutline]}>Skip</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={!selectedQuality}
          style={[styles.btn, selectedQuality ? styles.btnPrimary : styles.btnDisabled]}
          android_ripple={{ color: '#11182711' }}
        >
          <Text style={[styles.btnText, selectedQuality ? styles.btnTextPrimary : styles.btnTextDisabled]}>
            {isLast ? 'Complete' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  backBtn: { padding: 8, marginRight: 4, borderRadius: 999 },
  h1: { fontSize: 18, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center', marginTop: 6 },
  mutedCenter: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 },
  subtleCenter: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  subtle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  progressWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: '#f9fafb' },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  progressTrack: { width: '100%', height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 999, backgroundColor: '#111827' },

  personWrap: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  roleRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleText: { fontSize: 13, color: '#6b7280' },

  promptTitle: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  promptSub: { textAlign: 'center', fontSize: 12, color: '#6b7280' },

  optionCard: {
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  optionCardIdle: { borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  optionCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionEmoji: { fontSize: 22 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  actions: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
  },
  btnOutline: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  btnPrimary: { backgroundColor: '#111827' },
  btnDisabled: { backgroundColor: '#e5e7eb' },

  btnText: { fontSize: 15, fontWeight: '700' },
  btnTextOutline: { color: '#111827' },
  btnTextPrimary: { color: '#ffffff' },
  btnTextDisabled: { color: '#6b7280' },

  doneIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
});
