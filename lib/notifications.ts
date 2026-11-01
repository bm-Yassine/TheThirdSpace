import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Notifications.
 *
 * Two layers, deliberately separate:
 *
 *  1. A notification *record* written to Firestore for every notable event.
 *     This works on every platform including web, and powers the in-app
 *     inbox. It is the layer that matters today, since the app is used in a
 *     browser.
 *
 *  2. Push *delivery* on top, via Expo. expo-notifications has no web push
 *     implementation — that needs a service worker and VAPID keys — so push
 *     reaches iOS and Android only. The records are identical either way, so
 *     nothing is lost on web beyond the out-of-app alert.
 */

export type NotificationKind =
  | 'request_approved'
  | 'request_declined'
  | 'waitlist_promoted'
  | 'event_cancelled'
  | 'event_updated'
  | 'new_message'
  | 'event_reminder'
  | 'rating_ready';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where tapping it should go. */
  route?: string;
  params?: Record<string, string>;
  readAt?: any;
  createdAt?: any;
};

/** Foreground behaviour: show the banner rather than swallowing it silently. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Requests permission and returns an Expo push token.
 *
 * Returns null rather than throwing for every expected refusal — no
 * permission, a simulator, or web — because a missing token is a normal state
 * the app has to work without, not an error.
 */
export const registerForPush = async (): Promise<string | null> => {
  if (!pushSupported) return null;

  // Simulators cannot receive push, and asking there produces a confusing
  // permission prompt that can never result in a delivery.
  if (!Device.isDevice) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'The Third Space',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#4F46E5',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data || null;
  } catch (error) {
    console.warn('Push registration failed:', error);
    return null;
  }
};

/** Keeps the OS badge in step with the unread count. */
export const setBadgeCount = async (count: number) => {
  if (!pushSupported) return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Unsupported on some devices; not worth surfacing.
  }
};

/** Copy for each kind, kept in one place so the inbox and push agree. */
export const describeNotification = (
  kind: NotificationKind,
  context: { eventTitle?: string; personName?: string; reason?: string }
): { title: string; body: string } => {
  const event = context.eventTitle || 'an event';

  switch (kind) {
    case 'request_approved':
      return { title: "You're in", body: `The organizer approved you for ${event}.` };
    case 'request_declined':
      return {
        title: 'Request declined',
        body: `The organizer could not fit you into ${event} this time.`,
      };
    case 'waitlist_promoted':
      return {
        title: 'A place opened up',
        body: `You moved off the waitlist for ${event}.`,
      };
    case 'event_cancelled':
      return {
        title: 'Event cancelled',
        body: context.reason
          ? `${event} was cancelled. Reason: ${context.reason}`
          : `${event} was cancelled by the organizer.`,
      };
    case 'event_updated':
      return { title: 'Event changed', body: `${event} was updated by the organizer.` };
    case 'new_message':
      return {
        title: context.personName || 'New message',
        body: context.reason || 'Sent you a message.',
      };
    case 'event_reminder':
      return { title: 'Starting soon', body: `${event} starts soon.` };
    case 'rating_ready':
      return { title: 'How was it?', body: `Rate the people you met at ${event}.` };
    default:
      return { title: 'The Third Space', body: 'Something happened.' };
  }
};
