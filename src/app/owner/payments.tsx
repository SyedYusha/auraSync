import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MembershipStateBadge, PaymentStateBadge } from '@/components/gym/MembershipBadge';
import { FadeIn, SkeletonBlock } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  getMembershipState,
  getPaymentState,
  getRemainingBalance,
} from '@/domain/gym/membership';
import { formatGymDateTime } from '@/domain/gym/format';
import { useGymOwner } from '@/state/GymOwnerProvider';
import type { GymMember, GymPaymentRecord } from '@/types/gym';
import { colors, spacing, typography } from '@/theme';

export default function PaymentsScreen() {
  const { status, members, payments, dashboard, error, refresh } = useGymOwner();

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const outstandingMembers = useMemo(
    () =>
      members
        .map((member) => ({ member, balance: getRemainingBalance(member) }))
        .filter((entry) => entry.balance > 0)
        .sort((first, second) => second.balance - first.balance),
    [members],
  );
  const recentPayments = useMemo(
    () =>
      payments
        .slice()
        .sort((first, second) => new Date(second.paidAt).getTime() - new Date(first.paidAt).getTime())
        .slice(0, 12),
    [payments],
  );

  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }
  if (status === 'loading' || !dashboard) {
    return (
      <Screen scroll={false} contentStyle={styles.loadingContent}>
        <SkeletonBlock height={72} />
        <SkeletonBlock height={116} />
        <SkeletonBlock height={116} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Payments & Memberships</Text>
        </View>
        <StatusBadge label={`${dashboard.membersWithOutstandingPayments} DUE`} tone={dashboard.membersWithOutstandingPayments > 0 ? 'cyan' : 'good'} />
      </View>

      <FadeIn>
        <GlassCard style={styles.summaryCard}>
          <Ionicons name="wallet-outline" size={24} color={colors.cyan} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryValue}>{formatCurrency(dashboard.outstandingPaymentTotal)} outstanding</Text>
            <Text style={styles.summaryDetail}>
              {dashboard.membersWithOutstandingPayments === 0
                ? 'Every demo member is fully paid.'
                : `${dashboard.membersWithOutstandingPayments} members still owe a balance. Open a member to record a payment.`}
            </Text>
          </View>
        </GlassCard>
      </FadeIn>

      <Text style={styles.sectionTitle}>OUTSTANDING BALANCES</Text>
      {outstandingMembers.length === 0 ? (
        <GlassCard><Text style={styles.emptyText}>No outstanding balances right now.</Text></GlassCard>
      ) : (
        <View style={styles.list}>
          {outstandingMembers.map(({ member, balance }, index) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${member.fullName}, balance ${formatCurrency(balance)}`}
              onPress={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}>
              <FadeIn delay={Math.min(index * 40, 240)} duration={240}>
                <GlassCard padding={spacing.md} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.memberCopy}>
                      <Text style={styles.name}>{member.fullName}</Text>
                      <Text style={styles.plan}>{member.plan}</Text>
                    </View>
                    <Text style={styles.balance}>{formatCurrency(balance)}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <MembershipStateBadge state={getMembershipState(member)} />
                    <PaymentStateBadge state={getPaymentState(member)} />
                  </View>
                  <Text style={styles.detailLink}>Record payment <Ionicons name="arrow-forward" size={14} color={colors.cyan} /></Text>
                </GlassCard>
              </FadeIn>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>RECENT PAYMENTS</Text>
      <GlassCard padding={0}>
        {recentPayments.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded yet. Open a member to record one.</Text>
        ) : (
          recentPayments.map((payment, index) => (
            <PaymentRow key={payment.id} payment={payment} member={membersById.get(payment.memberId)} isLast={index === recentPayments.length - 1} />
          ))
        )}
      </GlassCard>
    </Screen>
  );
}

function PaymentRow({
  payment,
  member,
  isLast,
}: {
  readonly payment: GymPaymentRecord;
  readonly member: GymMember | undefined;
  readonly isLast: boolean;
}) {
  return (
    <View style={[styles.paymentRow, !isLast && styles.rowBorder]}>
      <View style={styles.paymentIcon}>
        <Ionicons name="cash-outline" size={17} color={colors.success} />
      </View>
      <View style={styles.paymentCopy}>
        <Text style={styles.paymentTitle}>{member?.fullName ?? 'Demo member'} · {formatCurrency(payment.amount)}</Text>
        <Text style={styles.paymentTime}>{formatGymDateTime(payment.paidAt)} · {PAYMENT_METHOD_LABELS[payment.method]}{payment.note ? ` · ${payment.note}` : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  loadingContent: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryCopy: { flex: 1, gap: 3 },
  summaryValue: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  summaryDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  list: { gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  memberCopy: { flex: 1, gap: 3 },
  name: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  plan: { color: colors.muted, fontSize: typography.caption },
  balance: { color: colors.warning, fontSize: typography.title, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  detailLink: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  paymentRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  paymentIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(83,229,188,0.12)' },
  paymentCopy: { flex: 1, gap: 2 },
  paymentTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  paymentTime: { color: colors.muted, fontSize: typography.caption },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', padding: spacing.lg },
});
