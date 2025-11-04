// PaymentScreen.tsx — React Native / Expo
import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X, CreditCard, Shield, Lock } from 'lucide-react-native';

type ActivityLite = {
  title: string;
  date: string;
  time: string;
  cost: number;
};

type Props = {
  activity: ActivityLite | null;
  isVisible: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
};

export default function PaymentScreen({
  activity,
  isVisible,
  onClose,
  onPaymentComplete,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!activity) return null;

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const updateCard = (field: keyof typeof cardDetails, value: string) =>
    setCardDetails((prev) => ({ ...prev, [field]: value }));

  const validateCardForm = () => {
    const { number, expiry, cvc, name } = cardDetails;
    if (!number || !expiry || !cvc || !name) {
      Alert.alert('Missing info', 'Please fill all card fields.');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (paymentMethod === 'card' && !validateCardForm()) return;

    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 2000)); // simulate processing
    setIsProcessing(false);

    onPaymentComplete();
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Bottom sheet */}
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.h2}>Complete Payment</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
              <X size={22} color="#111827" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Activity Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.h3}>{activity.title}</Text>
              <Text style={styles.subtle}>{activity.date} • {activity.time}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.summaryValue}>{formatCurrency(activity.cost)}</Text>
              </View>
            </View>

            {/* Payment Method */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.h4}>Payment Method</Text>

              <Pressable
                onPress={() => setPaymentMethod('card')}
                style={[
                  styles.radioItem,
                  paymentMethod === 'card' && styles.radioItemActive,
                ]}
              >
                <View style={styles.radioBulletOuter}>
                  {paymentMethod === 'card' && <View style={styles.radioBulletInner} />}
                </View>
                <CreditCard size={18} color="#6b7280" />
                <Text style={styles.radioText}>Credit/Debit Card</Text>
              </Pressable>

              <Pressable
                onPress={() => setPaymentMethod('paypal')}
                style={[
                  styles.radioItem,
                  paymentMethod === 'paypal' && styles.radioItemActive,
                ]}
              >
                <View style={styles.radioBulletOuter}>
                  {paymentMethod === 'paypal' && <View style={styles.radioBulletInner} />}
                </View>
                <View style={styles.paypalSquare}><Text style={styles.paypalP}>P</Text></View>
                <Text style={styles.radioText}>PayPal</Text>
              </Pressable>
            </View>

            {/* Card Form */}
            {paymentMethod === 'card' && (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    value={cardDetails.number}
                    onChangeText={(t) => updateCard('number', t)}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Expiry Date</Text>
                    <TextInput
                      value={cardDetails.expiry}
                      onChangeText={(t) => updateCard('expiry', t)}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>CVC</Text>
                    <TextInput
                      value={cardDetails.cvc}
                      onChangeText={(t) => updateCard('cvc', t)}
                      placeholder="123"
                      inputMode="numeric"
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.label}>Cardholder Name</Text>
                  <TextInput
                    value={cardDetails.name}
                    onChangeText={(t) => updateCard('name', t)}
                    placeholder="John Doe"
                    autoCapitalize="words"
                    style={styles.input}
                  />
                </View>

                {/* Security Notice */}
                <View style={styles.securityNote}>
                  <Shield size={18} color="#1d4ed8" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.secTitle}>Secure Payment</Text>
                    <Text style={styles.secText}>
                      Your payment information is encrypted and never stored.
                    </Text>
                  </View>
                </View>

                {/* Pay button */}
                <Pressable
                  onPress={handlePayment}
                  disabled={isProcessing}
                  style={[styles.btn, isProcessing ? styles.btnDisabled : styles.btnPrimary]}
                >
                  {isProcessing ? (
                    <>
                      <ActivityIndicator />
                      <Text style={styles.btnTextDisabled}> Processing…</Text>
                    </>
                  ) : (
                    <>
                      <Lock size={18} color="#ffffff" />
                      <Text style={styles.btnText}> Pay {formatCurrency(activity.cost)}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* PayPal */}
            {paymentMethod === 'paypal' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.subtle}>
                  You will be redirected to PayPal to complete your payment.
                </Text>
                <Pressable
                  onPress={handlePayment}
                  disabled={isProcessing}
                  style={[styles.btn, isProcessing ? styles.btnDisabled : styles.btnPaypal]}
                >
                  {isProcessing ? (
                    <Text style={styles.btnTextDisabled}>Processing…</Text>
                  ) : (
                    <Text style={styles.btnText}>Continue with PayPal — {formatCurrency(activity.cost)}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
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
  h2: { fontSize: 18, fontWeight: '700', color: '#111827' },
  h3: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  h4: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  iconBtn: { padding: 6, borderRadius: 999 },

  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  subtle: { color: '#6b7280', fontSize: 13 },
  summaryRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: '#111827' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#111827' },

  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  radioItemActive: { borderColor: '#111827', backgroundColor: '#f9fafb' },
  radioBulletOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#9ca3af',
    alignItems: 'center', justifyContent: 'center',
  },
  radioBulletInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827',
  },
  radioText: { fontSize: 14, color: '#111827', flex: 1 },

  paypalSquare: {
    width: 18, height: 18, borderRadius: 4, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
  },
  paypalP: { color: 'white', fontWeight: '800', fontSize: 12 },

  label: { fontSize: 13, color: '#111827', marginBottom: 6 },
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

  securityNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'flex-start',
  },
  secTitle: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  secText: { fontSize: 12, color: '#1d4ed8' },

  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimary: { backgroundColor: '#111827' },
  btnPaypal: { backgroundColor: '#2563eb' },
  btnDisabled: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnTextDisabled: { color: '#6b7280', fontSize: 15, fontWeight: '700' },
});
