import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { OutlineButton, PrimaryButton } from '@/components/ui/Feedback';
import { PAYMENT_METHOD_LABELS, formatCurrency, getPaymentAmountError, getRemainingBalance } from '@/domain/gym/membership';
import { colors, radii, spacing, typography } from '@/theme';
import type { GymMember, MutationResult, PaymentMethod } from '@/types/gym';

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface RecordPaymentModalProps {
  readonly visible: boolean;
  readonly member: GymMember | null;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (amount: number, method: PaymentMethod, note?: string) => Promise<MutationResult>;
}

interface PaymentDialogProps {
  readonly member: GymMember | null;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (amount: number, method: PaymentMethod, note?: string) => Promise<MutationResult>;
}

export function RecordPaymentModal({ visible, member, busy, onClose, onSubmit }: RecordPaymentModalProps) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <PaymentDialog member={member} busy={busy} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  );
}

function PaymentDialog({ member, busy, onClose, onSubmit }: PaymentDialogProps) {
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remaining = member ? getRemainingBalance(member) : 0;

  async function handleSubmit() {
    if (!member) return;
    const amount = amountText.trim() === '' ? Number.NaN : Number(amountText);
    const validationError = getPaymentAmountError(member, amount);
    setError(validationError);
    if (validationError) return;

    const result = await onSubmit(amount, method, note.trim() || undefined);
    if (!result.ok) {
      setError(result.error ?? 'The payment could not be saved. Please try again.');
    }
  }

  return (
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Close payment dialog" style={StyleSheet.absoluteFill} onPress={onClose} />
      <GlassCard style={styles.dialog}>
        <Text style={styles.title}>Record payment</Text>
        <Text style={styles.subtitle}>{member ? `${member.fullName} · remaining balance ${formatCurrency(remaining)}` : ''}</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>AMOUNT ($)</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder={remaining > 0 ? String(remaining) : '0'}
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            style={[styles.input, error && styles.inputError]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>METHOD</Text>
          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map((candidate) => (
              <Pressable
                key={candidate}
                accessibilityRole="button"
                accessibilityLabel={PAYMENT_METHOD_LABELS[candidate]}
                onPress={() => setMethod(candidate)}
                style={[styles.methodChip, method === candidate && styles.methodChipActive]}>
                <Text style={[styles.methodLabel, method === candidate && styles.methodLabelActive]}>{PAYMENT_METHOD_LABELS[candidate]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Renewal deposit"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <View style={styles.actionWrap}>
            <OutlineButton label="Cancel" onPress={onClose} />
          </View>
          <View style={styles.actionWrap}>
            <PrimaryButton label={busy ? 'Saving…' : 'Record payment'} onPress={() => void handleSubmit()} />
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, backgroundColor: 'rgba(3, 7, 8, 0.72)' },
  dialog: { gap: spacing.md },
  title: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: typography.caption },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.5 },
  input: {
    minHeight: 46,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(6, 35, 38, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.white,
    fontSize: typography.body,
  },
  inputError: { borderColor: 'rgba(255, 107, 107, 0.55)' },
  methodRow: { flexDirection: 'row', gap: spacing.xs },
  methodChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(6, 35, 38, 0.4)',
  },
  methodChipActive: { borderColor: 'rgba(0, 229, 255, 0.45)', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  methodLabel: { color: colors.silver, fontSize: typography.caption, fontWeight: '700', textAlign: 'center' },
  methodLabelActive: { color: colors.cyan },
  error: { color: colors.danger, fontSize: typography.caption, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionWrap: { flex: 1 },
});
