import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Avatar from './Avatar';
import { dataService } from '../Backend/firebase';
import type { Attendee } from '../lib/types';

/**
 * Who else is going.
 *
 * Previously only the organizer could see the attendee list, but seeing that
 * people are already coming — and who — is one of the strongest reasons
 * somebody commits. An empty-looking event reads as an event nobody wants.
 *
 * Only confirmed attendees are shown. Pending requests and waitlisted people
 * are the organizer's business, not public information.
 */

const MAX_VISIBLE = 8;

export default function AttendeeStrip({
  eventId,
  totalGoing,
  onMessage,
}: {
  eventId: string;
  totalGoing: number;
  /** Present when the viewer is allowed to start a conversation. */
  onMessage?: (uid: string, name: string) => void;
}) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    dataService
      .getEventParticipants(eventId, 'confirmed')
      .then((list) => {
        if (active) setAttendees(list);
      })
      .catch(() => {
        // A failed read should hide the strip, not break the page.
        if (active) setAttendees([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  // Nothing useful to show while loading or when nobody has joined; the
  // headline count above already says "0 going".
  if (loading || attendees.length === 0) return null;

  const visible = attendees.slice(0, MAX_VISIBLE);
  const overflow = Math.max(totalGoing, attendees.length) - visible.length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Who&apos;s going</Text>

      <View style={styles.row}>
        {visible.map((attendee) => (
          <Pressable
            key={attendee.uid}
            style={styles.person}
            disabled={!onMessage}
            onPress={() => onMessage?.(attendee.uid, attendee.name)}
          >
            <Avatar
              uid={attendee.uid}
              name={attendee.name}
              photoURL={attendee.photoURL}
              size={44}
            />
            <Text style={styles.name} numberOfLines={1}>
              {attendee.name?.split(' ')[0] || 'Guest'}
            </Text>
          </Pressable>
        ))}

        {overflow > 0 && (
          <View style={styles.person}>
            <View style={styles.overflowBubble}>
              <Text style={styles.overflowText}>+{overflow}</Text>
            </View>
            <Text style={styles.name}>more</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  heading: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  person: { alignItems: 'center', width: 52 },
  name: { fontSize: 11, color: '#6b7280', marginTop: 5, fontWeight: '600' },
  overflowBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { fontSize: 13, fontWeight: '700', color: '#4b5563' },
});
