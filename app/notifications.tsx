import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Ban,
  MessageCircle,
  Clock,
  Star,
  Bell,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { setBadgeCount, type AppNotification, type NotificationKind } from '../lib/notifications';
import { toDate } from '../lib/eventTime';

/**
 * The notification inbox.
 *
 * This is the layer that works everywhere. Push delivery only reaches iOS and
 * Android, so on web this screen is the whole notification experience — which
 * is why it is a real screen rather than a thin mirror of the push tray.
 */

const ICONS: Record<NotificationKind, typeof Bell> = {
  request_approved: CheckCircle2,
  request_declined: XCircle,
  waitlist_promoted: ArrowUpCircle,
  event_cancelled: Ban,
  event_updated: Clock,
  new_message: MessageCircle,
  event_reminder: Clock,
  rating_ready: Star,
};

const TINTS: Record<NotificationKind, [string, string]> = {
  request_approved: ['#dcfce7', '#15803d'],
  request_declined: ['#fef2f2', '#dc2626'],
  waitlist_promoted: ['#dcfce7', '#15803d'],
  event_cancelled: ['#fef2f2', '#dc2626'],
  event_updated: ['#eff6ff', '#2563eb'],
  new_message: ['#eef2ff', '#4f46e5'],
  event_reminder: ['#ffedd5', '#b45309'],
  rating_ready: ['#fef3c7', '#d97706'],
};

const relativeTime = (value: any): string => {
  const date = toDate(value);
  if (!date) return '';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen() {
  const { user, initializing } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    const unsubscribe = dataService.subscribeToNotifications(
      (next) => {
        setItems(next);
        setLoading(false);
        setBadgeCount(next.filter((item) => !item.readAt).length);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [initializing, user]);

  // Opening the inbox is the acknowledgement; marking each one individually
  // would be busywork.
  useEffect(() => {
    if (loading || items.length === 0) return;
    const unread = items.filter((item) => !item.readAt).map((item) => item.id);
    if (unread.length === 0) return;

    const timer = setTimeout(() => {
      dataService.markNotificationsRead(unread).catch(() => undefined);
      setBadgeCount(0);
    }, 700);
    return () => clearTimeout(timer);
  }, [loading, items]);

  const open = useCallback((item: AppNotification) => {
    if (!item.route) return;
    router.push({ pathname: item.route as any, params: item.params || {} });
  }, []);

  if (initializing || loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 && (
          <View style={styles.empty}>
            <Bell size={30} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyBody}>
              Approvals, waitlist moves, cancellations and messages land here.
            </Text>
          </View>
        )}

        {items.map((item) => {
          const Icon = ICONS[item.kind] ?? Bell;
          const [fill, ink] = TINTS[item.kind] ?? ['#f3f4f6', '#4b5563'];
          return (
            <Pressable
              key={item.id}
              onPress={() => open(item)}
              style={[styles.row, !item.readAt && styles.rowUnread]}
              disabled={!item.route}
            >
              <View style={[styles.rowIcon, { backgroundColor: fill }]}>
                <Icon size={17} color={ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody}>{item.body}</Text>
                <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
              </View>
              {!item.readAt && <View style={styles.unreadDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  centered: { justifyContent: 'center', alignItems: 'center' },

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

  content: { padding: 14, paddingBottom: 40, gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  rowUnread: { backgroundColor: '#f9fafb', borderColor: '#d1d5db' },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowBody: { fontSize: 13, color: '#4b5563', marginTop: 2, lineHeight: 18 },
  rowTime: { fontSize: 11, color: '#9ca3af', marginTop: 5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5', marginTop: 6 },

  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 12 },
  emptyBody: { fontSize: 13.5, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 19 },
});
