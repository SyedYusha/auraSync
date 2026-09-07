import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MembershipStateBadge, PaymentStateBadge } from '@/components/gym/MembershipBadge';
import { RecordPaymentModal } from '@/components/gym/RecordPaymentModal';
import { RiskBadge } from '@/components/gym/RiskBadge';
import { SimulatedCheckInButton } from '@/components/gym/SimulatedCheckInButton';
import { SuccessBanner } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { DangerButton, ErrorState, LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { getMemberAttendance } from '@/domain/gym/churn';
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  getMemberPayments,
  getMembershipState,
  getPaymentState,
  getRemainingBalance,
} from '@/domain/gym/membership';
import { formatGymDate, formatGymDateTime } from '@/domain/gym/format';
import { requestRetentionRecommendation } from '@/services/ai/retentionRecommendationApi';
import { useGymOwner } from '@/state/GymOwnerProvider';
import type { PaymentMethod, RetentionRecommendation } from '@/types/gym';
import { colors, spacing, typography } from '@/theme';

const BANNER_TIMEOUT_MS = 2600;

export default function GymMemberDetailScreen() {
  const { memberId: memberIdParam } = useLocalSearchParams<{ memberId: string }>();
  const memberId = Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam;
  const {
    status,
    members,
    attendance,
    payments,
    insights,
    checkedInTodayMemberIds,
    checkingInMemberId,
    isRecordingPayment,
    isDeactivatingMember,
    error,
    refresh,
    simulateCheckIn,
    recordPayment,
    deactivateMember,
  } = useGymOwner();
  const [recommendation, setRecommendation] = useState<RetentionRecommendation | null>(null);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isConfirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  function showBanner(message: string) {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerMessage(message);
    bannerTimer.current = setTimeout(() => setBannerMessage(null), BANNER_TIMEOUT_MS);
  }

  const member = useMemo(() => members.find((candidate) => candidate.id === memberId), [memberId, members]);
  const insight = useMemo(() => insights.find((candidate) => candidate.memberId === memberId), [insights, memberId]);
  const recentAttendance = useMemo(
    () => (memberId ? getMemberAttendance(attendance, memberId).slice(0, 6) : []),
    [attendance, memberId],
  );
  const memberPayments = useMemo(() => (memberId ? getMemberPayments(payments, memberId) : []), [memberId, payments]);

  async function handleCheckIn() {
    if (!member) return;
    const didCheckIn = await simulateCheckIn(member.id);
    if (didCheckIn) setRecommendation(null);
  }

  async function handleGenerateRecommendation() {
    if (!member || !insight || isGeneratingRecommendation) return;
    setIsGeneratingRecommendation(true);
    setRecommendation(null);

    try {
      const nextRecommendation = await requestRetentionRecommendation({
        member: {
          fullName: member.fullName,
          fitnessGoal: member.fitnessGoal,
        },
        attendance: {
          daysSinceLastCheckIn: insight.daysSinceLastCheckIn,
          checkInsLast30: insight.checkInsLast30,
          checkInsPrevious30: insight.checkInsPrevious30,
        },
        churn: {
          riskScore: insight.riskScore,
          riskLevel: insight.riskLevel,
          drivers: insight.drivers,
        },
      });
      setRecommendation(nextRecommendation);
    } finally {
      setIsGeneratingRecommendation(false);
    }
  }

  async function handleRecordPayment(amount: number, method: PaymentMethod, note?: string) {
    if (!member) return { ok: false } as const;
    const result = await recordPayment(member.id, amount, method, note);
    if (result.ok) {
      setPaymentModalVisible(false);
      showBanner('Payment recorded.');
      setRecommendation(null);
    }
    return result;
  }

  async function handleDeactivate() {
    if (!member) return;
    const result = await deactivateMember(member.id);
    setConfirmingDeactivation(false);
    if (result.ok) showBanner('Membership paused. History is retained.');
  }

  if (status === 'loading') {
    return <Screen scroll={false}><LoadingState label="Loading demo member…" /></Screen>;
  }

  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }

  if (!member) {
    return (
      <Screen scroll={false} contentStyle={styles.unavailable}>
        <Text style={styles.unavailableTitle}>Demo member unavailable</Text>
        <Text style={styles.unavailableDetail}>This synthetic member record could not be found.</Text>
        <PrimaryButton label="Back to members" onPress={() => router.replace('/owner/members' as never)} />
      </Screen>
    );
  }

  const membershipState = getMembershipState(member);
  const paymentState = getPaymentState(member);
  const remainingBalance = getRemainingBalance(member);
  const checkedInToday = checkedInTodayMemberIds.has(member.id);
  const lastVisit = !insight
    ? 'Paused'
    : insight.daysSinceLastCheckIn === null
      ? 'No visits'
      : insight.daysSinceLastCheckIn === 0
        ? 'Today'
        : `${insight.daysSinceLastCheckIn} days ago`;

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner/members' as never)}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Member Detail</Text>
        </View>
        {insight ? <RiskBadge level={insight.riskLevel} score={insight.riskScore} /> : <StatusBadge label="PAUSED" tone="muted" />}
      </View>

      {bannerMessage ? <SuccessBanner message={bannerMessage} /> : null}

      <GlassCard style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{member.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.memberName}>{member.fullName}</Text>
            <Text style={styles.memberGoal}>{member.fitnessGoal}</Text>
            <Text style={styles.memberJoined}>Member since {formatGymDate(member.joinedAt)}</Text>
          </View>
        </View>
        {member.isActive ? (
          <SimulatedCheckInButton
            checkedInToday={checkedInToday}
            isLoading={checkingInMemberId === member.id}
            onPress={() => void handleCheckIn()}
          />
        ) : (
          <Text style={styles.pausedNote}>Membership paused. Attendance tracking and churn signals are disabled, but history is retained.</Text>
        )}
      </GlassCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MEMBERSHIP & PAYMENT</Text>
        <View style={styles.badgeRow}>
          <MembershipStateBadge state={membershipState} />
          <PaymentStateBadge state={paymentState} />
        </View>
      </View>
      <GlassCard style={styles.termsCard}>
        <TermRow label="PLAN" value={member.plan} />
        <TermRow label="EXPIRES" value={formatGymDate(member.membershipExpiresAt)} />
        <TermRow label="TOTAL FEE" value={formatCurrency(member.totalFee)} />
        <TermRow label="AMOUNT PAID" value={formatCurrency(member.amountPaid)} />
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>BALANCE DUE</Text>
          <Text style={[styles.balanceValue, remainingBalance === 0 && styles.balanceCleared]}>{formatCurrency(remainingBalance)}</Text>
        </View>
        <View style={styles.actionRow}>
          {remainingBalance > 0 && member.isActive ? (
            <PrimaryButton label="Record payment" style={styles.actionButton} onPress={() => setPaymentModalVisible(true)} />
          ) : null}
          <OutlineButton label="Edit member" style={styles.actionButton} onPress={() => router.push({ pathname: '/owner/members/[memberId]/edit', params: { memberId: member.id } })} />
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
      <GlassCard padding={0}>
        {memberPayments.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded for this member yet.</Text>
        ) : (
          memberPayments.map((payment, index) => (
            <View key={payment.id} style={[styles.paymentRow, index < memberPayments.length - 1 && styles.rowBorder]}>
              <View style={styles.paymentIcon}>
                <Ionicons name="cash-outline" size={17} color={colors.success} />
              </View>
              <View style={styles.paymentCopy}>
                <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)} · {PAYMENT_METHOD_LABELS[payment.method]}</Text>
                <Text style={styles.paymentTime}>{formatGymDateTime(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ''}</Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>

      {insight ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ATTENDANCE SNAPSHOT</Text>
            <StatusBadge label={insight.trend.toUpperCase()} tone={insight.trend === 'declining' ? 'muted' : 'good'} />
          </View>
          <GlassCard style={styles.metricsCard}>
            <Metric value={lastVisit} label="LAST VISIT" />
            <View style={styles.metricDivider} />
            <Metric value={String(insight.checkInsLast30)} label="LAST 30 DAYS" />
            <View style={styles.metricDivider} />
            <Metric value={String(insight.checkInsPrevious30)} label="PRIOR 30 DAYS" />
          </GlassCard>

          <GlassCard style={styles.signalsCard}>
            <View style={styles.signalsHeader}>
              <Ionicons name="pulse-outline" size={20} color={colors.violet} />
              <Text style={styles.cardTitle}>Attendance signals</Text>
            </View>
            {insight.drivers.map((driver) => (
              <View key={driver} style={styles.driverRow}>
                <Ionicons name="ellipse" size={7} color={insight.riskLevel === 'high' ? colors.danger : colors.warning} />
                <Text style={styles.driver}>{driver}</Text>
              </View>
            ))}
          </GlassCard>

          <Text style={styles.sectionTitle}>RECENT CHECK-INS</Text>
          <GlassCard padding={0}>
            {recentAttendance.length === 0 ? (
              <Text style={styles.emptyText}>No synthetic check-ins recorded for this member.</Text>
            ) : (
              recentAttendance.map((record, index) => (
                <View key={record.id} style={[styles.checkInRow, index < recentAttendance.length - 1 && styles.rowBorder]}>
                  <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                  <View style={styles.checkInCopy}>
                    <Text style={styles.checkInTitle}>Check-in recorded</Text>
                    <Text style={styles.checkInTime}>{formatGymDateTime(record.checkedInAt)}</Text>
                  </View>
                  {record.source === 'simulated-owner-check-in' ? <StatusBadge label="SIMULATED" tone="cyan" /> : null}
                </View>
              ))
            )}
          </GlassCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI RETENTION REVIEW</Text>
            <StatusBadge label="OWNER REVIEW" tone="muted" />
          </View>
          <GlassCard style={styles.recommendationCard}>
            {recommendation ? (
              <>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationCopy}>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                    <Text style={styles.recommendationPriority}>{recommendation.priority}</Text>
                  </View>
                  <StatusBadge label={recommendation.isFallback ? 'DEMO FALLBACK' : 'AURA AI'} tone={recommendation.isFallback ? 'muted' : 'cyan'} />
                </View>
                <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
                <Text style={styles.recommendationLabel}>SUGGESTED ACTION</Text>
                <Text style={styles.recommendationText}>{recommendation.suggestedAction}</Text>
                <Text style={styles.recommendationLabel}>DRAFT OUTREACH</Text>
                <Text style={styles.outreachMessage}>{recommendation.outreachMessage}</Text>
              </>
            ) : (
              <Text style={styles.recommendationReason}>Generate a respectful, attendance-based draft for an owner to review. No message is sent and no action is automated.</Text>
            )}
            <PrimaryButton
              label={isGeneratingRecommendation ? 'Generating recommendation…' : recommendation ? 'Generate a new recommendation' : 'Generate retention recommendation'}
              onPress={() => void handleGenerateRecommendation()}
            />
          </GlassCard>
        </>
      ) : null}

      {member.isActive ? (
        <>
          <Text style={styles.sectionTitle}>MEMBERSHIP ACTIONS</Text>
          <GlassCard style={styles.dangerCard}>
            {isConfirmingDeactivation ? (
              <View style={styles.confirmCopy}>
                <Text style={styles.confirmTitle}>Pause this membership?</Text>
                <Text style={styles.confirmDetail}>{member.fullName} stops appearing in churn metrics and attendance tracking. Their payment and visit history is retained, and the membership can be edited afterwards.</Text>
                <View style={styles.actionRow}>
                  <OutlineButton label="Cancel" style={styles.actionButton} onPress={() => setConfirmingDeactivation(false)} />
                  <DangerButton label={isDeactivatingMember ? 'Pausing…' : 'Pause membership'} style={styles.actionButton} onPress={() => void handleDeactivate()} />
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.dangerTitle}>Pause membership</Text>
                <Text style={styles.dangerDetail}>Temporarily exclude this member from active operations. No records are deleted.</Text>
                <DangerButton label="Pause membership" onPress={() => setConfirmingDeactivation(true)} />
              </>
            )}
          </GlassCard>
        </>
      ) : null}

      <RecordPaymentModal
        visible={isPaymentModalVisible}
        member={member}
        busy={isRecordingPayment}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={handleRecordPayment}
      />
    </Screen>
  );
}

function Metric({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TermRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  unavailable: { justifyContent: 'center', gap: spacing.md },
  unavailableTitle: { color: colors.white, fontSize: typography.h2, fontWeight: '700', textAlign: 'center' },
  unavailableDetail: { color: colors.silver, fontSize: typography.body, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  profileCard: { gap: spacing.md },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.techTeal, borderWidth: 1, borderColor: colors.cyan },
  avatarText: { color: colors.cyan, fontSize: typography.h2, fontWeight: '800' },
  profileCopy: { flex: 1, gap: 3 },
  memberName: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  memberGoal: { color: colors.silver, fontSize: typography.body },
  memberJoined: { color: colors.muted, fontSize: typography.caption },
  pausedNote: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  termsCard: { gap: spacing.sm },
  termRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  termLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.4 },
  termValue: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
  balanceLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.4 },
  balanceValue: { color: colors.warning, fontSize: typography.title, fontWeight: '800' },
  balanceCleared: { color: colors.success },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  paymentRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(83,229,188,0.12)' },
  paymentCopy: { flex: 1, gap: 2 },
  paymentAmount: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  paymentTime: { color: colors.muted, fontSize: typography.caption },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  metricsCard: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: { color: colors.white, fontSize: typography.body, fontWeight: '800', textAlign: 'center' },
  metricLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.4, textAlign: 'center' },
  metricDivider: { width: 1, height: 38, backgroundColor: colors.line },
  signalsCard: { gap: spacing.sm },
  signalsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  driver: { flex: 1, color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  checkInRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkInCopy: { flex: 1, gap: 2 },
  checkInTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  checkInTime: { color: colors.muted, fontSize: typography.caption },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', padding: spacing.lg },
  recommendationCard: { gap: spacing.md },
  recommendationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  recommendationCopy: { flex: 1, gap: 3 },
  recommendationTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  recommendationPriority: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  recommendationReason: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  recommendationLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.5, marginTop: spacing.xs },
  recommendationText: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  outreachMessage: { color: colors.white, fontSize: typography.body, fontStyle: 'italic', lineHeight: 20 },
  dangerCard: { gap: spacing.sm, borderColor: 'rgba(255,107,107,0.24)' },
  dangerTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  dangerDetail: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  confirmCopy: { gap: spacing.sm },
  confirmTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  confirmDetail: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
});
