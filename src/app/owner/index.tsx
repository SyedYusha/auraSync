import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceTrend } from '@/components/gym/AttendanceTrend';
import { MembershipStateBadge } from '@/components/gym/MembershipBadge';
import { FadeIn, SkeletonBlock } from '@/components/gym/motion';
import { RiskBadge } from '@/components/gym/RiskBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { formatCurrency, getMembershipState, getRemainingBalance } from '@/domain/gym/membership';
import { formatGymDateTime } from '@/domain/gym/format';
import { useGymOwner } from '@/state/GymOwnerProvider';
import type { MembershipState } from '@/types/gym';
import { colors, radii, spacing, typography } from '@/theme';

const MEMBERSHIP_OVERVIEW_STATES: readonly MembershipState[] = ['active', 'expiring_soon', 'expired', 'suspended'];
const MEMBERSHIP_OVERVIEW_LABELS: Record<MembershipState, string> = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  suspended: 'Paused',
};

export default function GymOwnerDashboardScreen() {
  const { status, members, insights, dashboard, error, refresh } = useGymOwner();
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const membershipBreakdown = useMemo(() => {
    const counts: Record<MembershipState, number> = { active: 0, expiring_soon: 0, expired: 0, suspended: 0 };
    for (const member of members) {
      counts[getMembershipState(member)] += 1;
    }
    return MEMBERSHIP_OVERVIEW_STATES.map((state) => ({ state, label: MEMBERSHIP_OVERVIEW_LABELS[state], count: counts[state] }));
  }, [members]);

  const outstandingMembers = useMemo(
    () =>
      members
        .map((member) => ({ member, balance: getRemainingBalance(member) }))
        .filter((entry) => entry.balance > 0)
        .sort((first, second) => second.balance - first.balance)
        .slice(0, 3),
    [members],
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
        <SkeletonBlock height={116} />
      </Screen>
    );
  }

  const atRiskInsights = insights.filter((insight) => insight.riskLevel !== 'low').slice(0, 3);

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Owner Dashboard</Text>
        </View>
        <StatusBadge label="DEMO MODE" tone="muted" />
      </View>

      <FadeIn>
        <GlassCard style={styles.summaryCard}>
          <Ionicons name="analytics-outline" size={22} color={colors.cyan} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryValue}>
              {dashboard.activeMembers} of {dashboard.totalMembers} active
            </Text>
            <Text style={styles.summaryDetail}>
              {dashboard.inactiveMembers} paused · {dashboard.todayCheckIns} check-ins today
            </Text>
          </View>
        </GlassCard>
      </FadeIn>

      <View style={styles.statsGrid}>
        <Metric icon="enter-outline" value={dashboard.todayCheckIns} label="TODAY" tone="cyan" />
        <Metric icon="pulse-outline" value={dashboard.mediumOrHighRiskMembers} label="AT RISK" tone="warning" />
        <Metric icon="alert-circle-outline" value={dashboard.highRiskMembers} label="HIGH RISK" tone="danger" />
        <Metric icon="time-outline" value={dashboard.expiringSoonMembers} label="EXPIRING SOON" tone="warning" />
      </View>

      <FadeIn delay={40}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Attendance trend</Text>
              <Text style={styles.cardSubtitle}>Check-ins over the last seven days</Text>
            </View>
            <Ionicons name="bar-chart-outline" size={21} color={colors.violet} />
          </View>
          <AttendanceTrend data={dashboard.attendanceTrend} />
        </GlassCard>
      </FadeIn>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MEMBERSHIP OVERVIEW</Text>
        <Text style={styles.sectionDetail}>{dashboard.totalMembers} members</Text>
      </View>
      <GlassCard style={styles.overviewCard}>
        {membershipBreakdown.map((entry, index) => (
          <View key={entry.state} style={[styles.overviewRow, index < membershipBreakdown.length - 1 && styles.overviewBorder]}>
            <View style={styles.overviewCopy}>
              <Text style={styles.overviewLabel}>{entry.label}</Text>
              <MembershipStateBadge state={entry.state} />
            </View>
            <Text style={styles.overviewValue}>{entry.count}</Text>
          </View>
        ))}
      </GlassCard>

      <View style={styles.actionGrid}>
        <DashboardAction icon="people-outline" title="Members" detail="Directory & check-ins" onPress={() => router.push('/owner/members' as never)} />
        <DashboardAction icon="calendar-outline" title="Attendance" detail="Today’s simulated visits" onPress={() => router.push('/owner/attendance')} />
        <DashboardAction icon="sparkles-outline" title="Churn intelligence" detail="Attendance risk signals" onPress={() => router.push('/owner/churn')} />
        <DashboardAction icon="wallet-outline" title="Payments & memberships" detail={`${formatCurrency(dashboard.outstandingPaymentTotal)} outstanding`} onPress={() => router.push('/owner/payments')} />
        <DashboardAction icon="person-circle-outline" title="Profile" detail="Owner workspace & sign out" onPress={() => router.push('/owner/profile')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PRIORITY OUTREACH</Text>
        <Text style={styles.sectionDetail}>{dashboard.mediumOrHighRiskMembers} members to review</Text>
      </View>
      {atRiskInsights.length === 0 ? (
        <GlassCard><Text style={styles.emptyText}>No medium or high attendance-risk members right now.</Text></GlassCard>
      ) : (
        <View style={styles.list}>
          {atRiskInsights.map((insight) => {
            const member = membersById.get(insight.memberId);
            if (!member) return null;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${member.fullName}`}
                onPress={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}>
                <GlassCard padding={spacing.md} style={styles.listCard}>
                  <View style={styles.listTop}>
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>{member.fullName}</Text>
                      <Text style={styles.memberDetail}>{insight.drivers[0] ?? 'Attendance review needed'}</Text>
                    </View>
                    <RiskBadge level={insight.riskLevel} score={insight.riskScore} />
                  </View>
                  <Text style={styles.openDetail}>Open member detail <Ionicons name="arrow-forward" size={14} color={colors.cyan} /></Text>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>OUTSTANDING BALANCES</Text>
        <Text style={styles.sectionDetail}>{formatCurrency(dashboard.outstandingPaymentTotal)} due</Text>
      </View>
      {outstandingMembers.length === 0 ? (
        <GlassCard><Text style={styles.emptyText}>Every demo member is fully paid.</Text></GlassCard>
      ) : (
        <View style={styles.list}>
          {outstandingMembers.map(({ member, balance }) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Record payment for ${member.fullName}`}
              onPress={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}>
              <GlassCard padding={spacing.md} style={styles.listCard}>
                <View style={styles.listTop}>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberDetail}>{member.plan}</Text>
                  </View>
                  <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
                </View>
                <Text style={styles.openDetail}>Open to record payment <Ionicons name="arrow-forward" size={14} color={colors.cyan} /></Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT CHECK-INS</Text>
        <Text style={styles.sectionDetail}>Synthetic demo activity</Text>
      </View>
      <GlassCard padding={0}>
        {dashboard.recentAttendance.length === 0 ? (
          <Text style={styles.emptyText}>No check-ins recorded yet.</Text>
        ) : (
          dashboard.recentAttendance.map((record, index) => {
            const member = membersById.get(record.memberId);
            return (
              <View key={record.id} style={[styles.checkInRow, index < dashboard.recentAttendance.length - 1 && styles.rowBorder]}>
                <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                <View style={styles.checkInCopy}>
                  <Text style={styles.checkInName}>{member?.fullName ?? 'Demo member'}</Text>
                  <Text style={styles.checkInTime}>{formatGymDateTime(record.checkedInAt)}</Text>
                </View>
                {record.source === 'simulated-owner-check-in' ? <StatusBadge label="SIMULATED" tone="cyan" /> : null}
              </View>
            );
          })
        )}
      </GlassCard>
    </Screen>
  );
}

function Metric({ icon, value, label, tone }: { readonly icon: keyof typeof Ionicons.glyphMap; readonly value: number; readonly label: string; readonly tone: 'cyan' | 'warning' | 'danger' }) {
  const color = tone === 'cyan' ? colors.cyan : tone === 'warning' ? colors.warning : colors.danger;
  return (
    <GlassCard padding={spacing.md} style={styles.metric}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={[styles.metricValue, tone !== 'cyan' && { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );
}

function DashboardAction({ icon, title, detail, onPress }: { readonly icon: keyof typeof Ionicons.glyphMap; readonly title: string; readonly detail: string; readonly onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Ionicons name={icon} size={21} color={colors.cyan} />
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  loadingContent: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryCopy: { flex: 1, gap: 3 },
  summaryValue: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  summaryDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', minHeight: 104, gap: 4 },
  metricValue: { color: colors.white, fontSize: typography.h1, fontWeight: '800', marginTop: spacing.xs },
  metricLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  card: { gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  cardSubtitle: { color: colors.muted, fontSize: typography.caption, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  sectionDetail: { color: colors.muted, fontSize: typography.caption, textAlign: 'right' },
  overviewCard: { gap: 0 },
  overviewRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  overviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  overviewCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  overviewLabel: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  overviewValue: { color: colors.white, fontSize: typography.title, fontWeight: '800' },
  actionGrid: { gap: spacing.sm },
  action: { minHeight: 68, borderRadius: radii.md, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionPressed: { opacity: 0.7 },
  actionCopy: { flex: 1, gap: 2 },
  actionTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  actionDetail: { color: colors.muted, fontSize: typography.caption },
  list: { gap: spacing.sm },
  listCard: { gap: spacing.sm },
  listTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  memberCopy: { flex: 1, gap: 3 },
  memberName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  memberDetail: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  balanceValue: { color: colors.warning, fontSize: typography.title, fontWeight: '800' },
  openDetail: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center' },
  checkInRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  checkInCopy: { flex: 1, gap: 2 },
  checkInName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  checkInTime: { color: colors.muted, fontSize: typography.caption },
});
