import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { setBadgeCount } from '../lib/notifications';

/**
 * Entry point to the inbox, with an unread count.
 *
 * Lives in screen headers rather than the floating navigation: the nav is a
 * five-slot shape that the design depends on, and a sixth item would unbalance
 * it. Notifications are a check-in, not a primary destination.
 */
export default function NotificationBell({
  tone = 'dark',
}: {
  /** 'light' for placement over photography. */
  tone?: 'dark' | 'light';
}) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = dataService.subscribeToNotifications(
        (items) => {
          const count = items.filter((item) => !item.readAt).length;
          setUnread(count);
          setBadgeCount(count);
        },
        () => setUnread(0)
      );
    } catch {
      // Not signed in yet; the effect re-runs when the user arrives.
    }
    return unsubscribe;
  }, [user]);

  if (!user) return null;

  const ink = tone === 'light' ? '#ffffff' : '#374151';

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={[styles.button, tone === 'dark' && styles.buttonDark]}
      hitSlop={8}
    >
      <Bell size={19} color={ink} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 8, borderRadius: 999 },
  buttonDark: { backgroundColor: '#f3f4f6' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
});
