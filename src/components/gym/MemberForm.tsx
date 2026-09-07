import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MembershipStateBadge, PaymentStateBadge } from '@/components/gym/MembershipBadge';
import { SuccessBanner } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import {
  formatCurrency,
  getMembershipState,
  getPaymentState,
  getRemainingBalance,
  toDateString,
  validateMemberInput,
} from '@/domain/gym/membership';
import { colors, radii, spacing, typography } from '@/theme';
import type { MemberFieldErrors, MemberInput, MembershipPlan, MutationResult } from '@/types/gym';

const PLANS: readonly MembershipPlan[] = ['Basic Monthly', 'Premium Monthly', 'Annual'];

interface MemberFormProps {
  readonly initial?: MemberInput;
  readonly submitLabel: string;
  readonly busy: boolean;
  readonly onSubmit: (input: MemberInput) => Promise<MutationResult>;
  readonly onSuccess?: () => void;
}

function parseAmount(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

export function MemberForm({ initial, submitLabel, busy, onSubmit, onSuccess }: MemberFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [plan, setPlan] = useState<MembershipPlan>(initial?.plan ?? 'Basic Monthly');
  const [joinedAt, setJoinedAt] = useState(() => initial ? toDateString(initial.joinedAt) : toDateString(new Date().toISOString()));
  const [membershipExpiresAt, setMembershipExpiresAt] = useState(() => {
    if (initial) return toDateString(initial.membershipExpiresAt);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return toDateString(expiryDate.toISOString());
  });
  const [totalFeeText, setTotalFeeText] = useState(initial ? String(initial.totalFee) : '');
  const [amountPaidText, setAmountPaidText] = useState(initial ? String(initial.amountPaid) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<MemberFieldErrors>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const totalFee = parseAmount(totalFeeText);
  const amountPaid = parseAmount(amountPaidText);

  const preview = useMemo(() => {
    if (!Number.isFinite(totalFee) || !Number.isFinite(amountPaid)) return null;
    return {
      balance: getRemainingBalance({ totalFee, amountPaid }),
      membershipState: getMembershipState({ isActive: true, membershipExpiresAt }),
      paymentState: getPaymentState({ isActive: true, membershipExpiresAt, totalFee, amountPaid }),
    };
  }, [amountPaid, membershipExpiresAt, totalFee]);

  async function handleSubmit() {
    const input: MemberInput = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      plan,
      joinedAt,
      membershipExpiresAt,
      totalFee,
      amountPaid,
      notes: notes.trim() || undefined,
    };
    const errors = validateMemberInput(input);
    setFieldErrors(errors);
    setMutationError(null);
    if (Object.keys(errors).length > 0) return;

    const result = await onSubmit(input);
    if (result.ok) {
      setSaved(true);
      onSuccess?.();
    } else {
      setMutationError(result.error ?? 'The member could not be saved. Please try again.');
    }
  }

  return (
    <View style={styles.form}>
      {saved ? <SuccessBanner message="Member saved." /> : null}
      {mutationError ? <Text style={styles.mutationError}>{mutationError}</Text> : null}

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Member details</Text>
        <Field label="FULL NAME" error={fieldErrors.fullName}>
          <FormInput value={fullName} onChangeText={setFullName} placeholder="e.g. Maya Chen" error={Boolean(fieldErrors.fullName)} />
        </Field>
        <Field label="EMAIL" error={fieldErrors.email}>
          <FormInput
            value={email}
            onChangeText={setEmail}
            placeholder="member@aurasync.fit"
            keyboardType="email-address"
            autoCapitalize="none"
            error={Boolean(fieldErrors.email)}
          />
        </Field>
        <Field label="PHONE" error={fieldErrors.phone}>
          <FormInput value={phone} onChangeText={setPhone} placeholder="+1 555 0100" keyboardType="phone-pad" error={Boolean(fieldErrors.phone)} />
        </Field>
        <Field label="MEMBERSHIP PLAN">
          <View style={styles.planRow}>
            {PLANS.map((candidate) => (
              <Pressable
                key={candidate}
                accessibilityRole="button"
                accessibilityLabel={candidate}
                onPress={() => setPlan(candidate)}
                style={[styles.planChip, plan === candidate && styles.planChipActive]}>
                <Text style={[styles.planChipLabel, plan === candidate && styles.planChipLabelActive]}>{candidate}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Membership terms</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairField}>
            <Field label="JOIN DATE" error={fieldErrors.joinedAt}>
              <FormInput value={joinedAt} onChangeText={setJoinedAt} placeholder="YYYY-MM-DD" autoCapitalize="none" error={Boolean(fieldErrors.joinedAt)} />
            </Field>
          </View>
          <View style={styles.pairField}>
            <Field label="EXPIRY DATE" error={fieldErrors.membershipExpiresAt}>
              <FormInput
                value={membershipExpiresAt}
                onChangeText={setMembershipExpiresAt}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                error={Boolean(fieldErrors.membershipExpiresAt)}
              />
            </Field>
          </View>
        </View>
        <View style={styles.pairRow}>
          <View style={styles.pairField}>
            <Field label="TOTAL FEE ($)" error={fieldErrors.totalFee}>
              <FormInput value={totalFeeText} onChangeText={setTotalFeeText} placeholder="40" keyboardType="numeric" error={Boolean(fieldErrors.totalFee)} />
            </Field>
          </View>
          <View style={styles.pairField}>
            <Field label="PAID ($)" error={fieldErrors.amountPaid}>
              <FormInput value={amountPaidText} onChangeText={setAmountPaidText} placeholder="0" keyboardType="numeric" error={Boolean(fieldErrors.amountPaid)} />
            </Field>
          </View>
        </View>
        <Field label="NOTES (OPTIONAL)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Training preferences, renewal reminders…"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.notesInput]}
          />
        </Field>
      </GlassCard>

      {preview ? (
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Review summary</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>BALANCE DUE</Text>
            <Text style={[styles.previewValue, preview.balance > 0 ? styles.balanceDue : styles.balanceCleared]}>{formatCurrency(preview.balance)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>MEMBERSHIP</Text>
            <MembershipStateBadge state={preview.membershipState} />
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>PAYMENT</Text>
            <PaymentStateBadge state={preview.paymentState} />
          </View>
        </GlassCard>
      ) : null}

      <PrimaryButton label={busy ? 'Saving…' : submitLabel} onPress={() => void handleSubmit()} />
    </View>
  );
}

function Field({ label, error, children }: { readonly label: string; readonly error?: string; readonly children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

interface FormInputProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly error?: boolean;
  readonly keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  readonly autoCapitalize?: 'none' | 'sentences';
}

function FormInput({ value, onChangeText, placeholder, error, keyboardType = 'default', autoCapitalize = 'sentences' }: FormInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      style={[styles.input, error && styles.inputError]}
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  card: { gap: spacing.md },
  cardTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.5 },
  fieldError: { color: colors.danger, fontSize: typography.caption },
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
  notesInput: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm },
  planRow: { flexDirection: 'row', gap: spacing.xs },
  planChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(6, 35, 38, 0.4)',
  },
  planChipActive: { borderColor: 'rgba(0, 229, 255, 0.45)', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  planChipLabel: { color: colors.silver, fontSize: typography.caption, fontWeight: '700', textAlign: 'center' },
  planChipLabelActive: { color: colors.cyan },
  pairRow: { flexDirection: 'row', gap: spacing.sm },
  pairField: { flex: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  previewLabel: { color: colors.muted, fontSize: typography.caption, fontWeight: '700', letterSpacing: 0.4 },
  previewValue: { fontSize: typography.body, fontWeight: '800' },
  balanceDue: { color: colors.warning },
  balanceCleared: { color: colors.success },
  mutationError: { color: colors.danger, fontSize: typography.body, lineHeight: 20 },
});
