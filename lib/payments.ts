import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { auth, dataService } from '../Backend/firebase';
import { PAYMENTS_API_BASE_URL, STRIPE_ENABLED } from './config';

/**
 * Client half of the Stripe Checkout flow.
 *
 * The server owns the price and the confirmation; this module only starts the
 * session and hands the user over to Stripe's hosted page. That avoids
 * shipping a native Stripe SDK, so the same code path works on web, iOS and
 * Android.
 *
 * When no publishable key is configured the app falls back to a clearly
 * labelled demo mode so the project stays runnable without Stripe credentials.
 */

export const isStripeConfigured = () => STRIPE_ENABLED;

const authorizedFetch = async (path: string, body: unknown) => {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in.');

  const token = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Payment request failed');
  return payload;
};

/**
 * Reserves the user's place as payment-pending, then sends them to Stripe.
 * Reserving first means a completed payment always has a participant row to
 * settle against, whichever order the webhook and the redirect arrive in.
 */
export const startCheckout = async (eventId: string) => {
  await dataService.joinEvent(eventId);

  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

  const { url } = await authorizedFetch('/create-checkout-session', {
    eventId,
    returnUrl: origin,
  });

  if (!url) throw new Error('Stripe did not return a checkout URL');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return { redirected: true as const };
  }

  await WebBrowser.openBrowserAsync(url);
  return { redirected: false as const };
};

/** Settles a Checkout Session immediately on return, ahead of the webhook. */
export const confirmCheckout = async (sessionId: string) => {
  return authorizedFetch('/confirm-checkout', { sessionId }) as Promise<{
    paid: boolean;
    eventId?: string;
    status?: string;
  }>;
};

/**
 * Demo fallback used when Stripe is not configured. Records the payment and
 * confirms the place, exactly as the real flow does, but without money moving.
 */
export const runDemoPayment = async (eventId: string, amount: number) => {
  await dataService.joinEvent(eventId);
  await dataService.recordPayment(eventId, amount, 'card', 'completed');
  await dataService.markParticipantPaid(eventId);
};
