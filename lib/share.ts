import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PUBLIC_SITE_URL } from './config';
import { formatEventDateLabel, formatEventTimeRange } from './eventTime';

/**
 * Sharing an event.
 *
 * Events spread by someone sending a link to a friend, so the link has to open
 * the event itself rather than the home feed — hence the deep path with the id
 * rather than just the domain.
 */

/** Absolute, openable URL for one event. */
export const eventUrl = (eventId: string): string => {
  // On web, prefer the origin actually being served so a preview deploy shares
  // a link back to itself instead of to production.
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : PUBLIC_SITE_URL;

  return `${base}/activity_detail?eventId=${encodeURIComponent(eventId)}`;
};

/** The message that accompanies the link. */
export const eventShareMessage = (event: any): string => {
  const when = `${formatEventDateLabel(event)} · ${formatEventTimeRange(event)}`;
  const where = event?.location ? ` at ${event.location}` : '';
  return `${event?.title ?? 'This event'} — ${when}${where}`;
};

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Opens the platform share sheet, falling back to the clipboard.
 *
 * `navigator.share` exists on mobile browsers but not most desktop ones, and
 * React Native's Share on web only opens a print-style dialog, so web is
 * handled explicitly rather than relying on the RN shim.
 */
export const shareEvent = async (event: any): Promise<ShareOutcome> => {
  const url = eventUrl(String(event?.id ?? ''));
  const message = eventShareMessage(event);

  if (Platform.OS === 'web') {
    const canUseWebShare =
      typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

    if (canUseWebShare) {
      try {
        await (navigator as any).share({ title: event?.title, text: message, url });
        return 'shared';
      } catch (error: any) {
        // The user closing the sheet is not a failure.
        if (error?.name === 'AbortError') return 'dismissed';
      }
    }

    try {
      await Clipboard.setStringAsync(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  try {
    const result = await Share.share({ message: `${message}\n${url}`, url, title: event?.title });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
};
