import { StyleSheet, Text } from 'react-native';

import { MEMBERSHIP_STATE_LABELS, PAYMENT_STATE_LABELS } from '@/domain/gym/membership';
import { colors, radii, spacing, typography } from '@/theme';
import type { MembershipState, PaymentState } from '@/types/gym';

const MEMBERSHIP_TONES: Record<MembershipState, { readonly color: string; readonly background: string }> = {
  active: { color: colors.success, background: 'rgba(83, 229, 188, 0.12)' },
  expiring_soon: { color: colors.warning, background: 'rgba(242, 180, 65, 0.12)' },
  expired: { color: colors.danger, background: 'rgba(255, 107, 107, 0.12)' },
  suspended: { color: colors.silver, background: 'rgba(166, 178, 184, 0.12)' },
};

const PAYMENT_TONES: Record<PaymentState, { readonly color: string; readonly background: string }> = {
  paid: { color: colors.success, background: 'rgba(83, 229, 188, 0.12)' },
  partial: { color: colors.warning, background: 'rgba(242, 180, 65, 0.12)' },
  pending: { color: colors.silver, background: 'rgba(166, 178, 184, 0.12)' },
  overdue: { color: colors.danger, background: 'rgba(255, 107, 107, 0.12)' },
};

export function MembershipStateBadge({ state }: { readonly state: MembershipState }) {
  const tone = MEMBERSHIP_TONES[state];
  return <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.background }]}>{MEMBERSHIP_STATE_LABELS[state].toUpperCase()}</Text>;
}

export function PaymentStateBadge({ state }: { readonly state: PaymentState }) {
  const tone = PAYMENT_TONES[state];
  return <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.background }]}>{PAYMENT_STATE_LABELS[state].toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    fontSize: typography.label,
    fontWeight: '800',
    overflow: 'hidden',
  },
});
