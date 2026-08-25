import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CreditCard, Lock, ShieldCheck, Info } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { dataService } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import { isStripeConfigured, runDemoPayment, startCheckout } from '../lib/payments';
import { formatEventDate, formatEventTime } from '../lib/eventTime';
import { invalidateEventFeedCache } from '../lib/eventFeed';

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');
  const { user, initializing } = useAuth();

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const stripeReady = isStripeConfigured();

  useEffect(() => {
    if (initializing) return;

    if (!user) {
      setLoading(false);
      Alert.alert('Sign in required', 'Please sign in to continue.', [
        { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
        { text: 'Sign In', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    dataService
      .getEvent(eventId)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [eventId, initializing, user]);

  // Price comes from the event document, never from a navigation param — a
  // param could be tampered with, and the server re-checks it regardless.
  const amount = Number(event?.cost || 0);

  const amountLabel = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }, [amount]);

  const onPay = async () => {
    if (!eventId || amount <= 0) {
      Alert.alert('Invalid payment', 'This event has no price attached.');
      return;
    }

    setProcessing(true);
    try {
      if (stripeReady) {
        const result = await startCheckout(eventId);
        // On web the browser is already navigating away; on native the user
        // comes back to this screen after the in-app browser closes.
        if (!result.redirected) {
          router.replace({ pathname: '/activity_detail', params: { eventId } });
        }
        return;
      }

      await runDemoPayment(eventId, amount);
      invalidateEventFeedCache();
      Alert.alert('Demo payment complete', 'Your place is confirmed. No money was charged.', [
        {
          text: 'Continue',
          onPress: () => router.replace({ pathname: '/activity_detail', params: { eventId } }),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Payment failed', error?.message || 'Please try again in a moment.');
    } finally {
      setProcessing(false);
    }
  };

  if (initializing || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.summaryTitle}>Event not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.payButton, { marginTop: 18 }]}>
          <Text style={styles.payButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{event.title}</Text>
          <Text style={styles.summaryMeta}>
            {formatEventDate(event)} • {formatEventTime(event)}
          </Text>
          {!!event.location && <Text style={styles.summaryMeta}>{event.location}</Text>}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryAmount}>{amountLabel}</Text>
          </View>
        </View>

        {stripeReady ? (
          <View style={styles.infoCard}>
            <ShieldCheck size={18} color="#15803d" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Secure checkout by Stripe</Text>
              <Text style={styles.infoBody}>
                You will be taken to Stripe to pay. Card details are entered on Stripe&apos;s
                page and never touch this app.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.infoCard, styles.infoCardAmber]}>
            <Info size={18} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: '#92400e' }]}>Demo mode</Text>
              <Text style={[styles.infoBody, { color: '#b45309' }]}>
                Stripe is not configured, so this will confirm your place without charging
                anything. Add a publishable key to enable real payments.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.methodRow}>
          <CreditCard size={18} color="#4b5563" />
          <Text style={styles.methodText}>
            {stripeReady ? 'Card, Apple Pay and Google Pay' : 'Simulated card'}
          </Text>
        </View>

        <Pressable
          onPress={onPay}
          disabled={processing}
          style={[styles.payButton, processing && styles.payButtonDisabled]}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Lock size={16} color="#fff" />
              <Text style={styles.payButtonText}>
                {stripeReady ? `Pay ${amountLabel}` : `Confirm ${amountLabel} (demo)`}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.finePrint}>
          Your place is held as pending until payment completes. If you cancel, the spot is
          released back to the waitlist.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: { color: '#6b7280', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  content: { padding: 16, gap: 16 },

  summaryCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  summaryMeta: { fontSize: 13, color: '#6b7280', marginTop: 3 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d5db',
  },
  summaryLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#111827' },

  infoCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 13,
  },
  infoCardAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  infoBody: { fontSize: 12, color: '#166534', marginTop: 3, lineHeight: 17 },

  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  methodText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  payButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    // Horizontal padding matters for the narrow empty-state variant, where the
    // button sizes to its label instead of filling the content column.
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  finePrint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 16 },
});
