import React, { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CreditCard, Lock, Shield } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authService, dataService } from '../Backend/firebase';

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const eventId = String(params.eventId || '');
  const amount = Number(params.amount || 0);
  const title = String(params.title || 'Event Payment');

  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });

  const amountLabel = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }, [amount]);

  const updateCard = (field: keyof typeof card, value: string) => {
    setCard((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!eventId || !amount || amount <= 0) {
      Alert.alert('Invalid Payment', 'Missing payment details. Please return and try again.');
      return false;
    }

    if (method === 'card' && (!card.number || !card.expiry || !card.cvc || !card.name)) {
      Alert.alert('Missing Info', 'Please fill all card fields.');
      return false;
    }

    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;

    const user = authService.getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please sign in first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await dataService.recordPayment(eventId, amount, method === 'paypal' ? 'paypal' : 'card', 'completed');
      await dataService.commitToEvent(eventId, { paymentCompleted: true });

      Alert.alert('Payment Successful', 'Your event commitment has been confirmed.', [
        {
          text: 'Continue',
          onPress: () =>
            router.replace({
              pathname: '/activity_detail',
              params: { eventId, refresh: Date.now().toString() },
            }),
        },
      ]);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Could not complete payment right now. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{title}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryAmount}>{amountLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Pressable
          onPress={() => setMethod('card')}
          style={[styles.methodRow, method === 'card' && styles.methodRowActive]}
        >
          <CreditCard size={18} color="#6b7280" />
          <Text style={styles.methodText}>Credit / Debit Card</Text>
        </Pressable>
        <Pressable
          onPress={() => setMethod('paypal')}
          style={[styles.methodRow, method === 'paypal' && styles.methodRowActive]}
        >
          <Text style={styles.methodText}>PayPal</Text>
        </Pressable>

        {method === 'card' && (
          <View style={styles.cardForm}>
            <View>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                value={card.number}
                onChangeText={(t) => updateCard('number', t)}
                placeholder="1234 5678 9012 3456"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <TextInput
                  value={card.expiry}
                  onChangeText={(t) => updateCard('expiry', t)}
                  placeholder="MM/YY"
                  style={styles.input}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput
                  value={card.cvc}
                  onChangeText={(t) => updateCard('cvc', t)}
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                value={card.name}
                onChangeText={(t) => updateCard('name', t)}
                placeholder="John Doe"
                style={styles.input}
              />
            </View>

            <View style={styles.securityBox}>
              <Shield size={18} color="#1d4ed8" />
              <Text style={styles.securityText}>Your payment information is encrypted and never stored.</Text>
            </View>
          </View>
        )}

        <Pressable onPress={handlePay} disabled={isProcessing} style={[styles.payButton, isProcessing && styles.payButtonDisabled]}>
          {isProcessing ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.payText}> Processing…</Text>
            </>
          ) : (
            <>
              <Lock size={18} color="#fff" />
              <Text style={styles.payText}> Pay {amountLabel}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelText: { fontSize: 16, color: '#111827' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16 },

  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  summaryRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: '#374151' },
  summaryAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  methodRowActive: { borderColor: '#111827', backgroundColor: '#f9fafb' },
  methodText: { fontSize: 14, color: '#111827' },

  cardForm: { gap: 12, marginTop: 8 },
  inputLabel: { fontSize: 13, color: '#111827', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center' },

  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  securityText: { fontSize: 12, color: '#1d4ed8', flex: 1 },

  payButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#111827',
  },
  payButtonDisabled: { backgroundColor: '#6b7280' },
  payText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});