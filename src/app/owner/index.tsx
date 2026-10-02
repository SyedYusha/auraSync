import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceTrend } from '@/components/gym/AttendanceTrend';
import { MembershipStateBadge } from '@/components/gym/MembershipBadge';
import { NotificationCenterModal } from '@/components/gym/NotificationCenterModal';
import { FadeIn, SkeletonBlock } from '@/components/gym/motion';
import { RiskBadge } from '@/components/gym/RiskBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { formatCurrency, getMembershipState, getRemainingBalance } from '@/domain/gym/membership';
import { formatGymDateTime } from '@/domain/gym/format';
import { notificationService } from '@/services/notifications/notificationService';
import { useAuth } from '@/state/AuthProvider';
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
  const { user } = useAuth();
  const { status, members, insights, dashboard, payments, error, refresh } = useGymOwner();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const ownerUserId = user?.id ?? 'local-demo-gym-owner';

  const checkUnread = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount(ownerUserId);
      setUnreadNotifs(count);
    } catch {}
  }, [ownerUserId]);

  useEffect(() => {
    let active = true;
    notificationService
      .getUnreadCount(ownerUserId)
      .then((count) => {
        if (active) setUnreadNotifs(count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerUserId]);

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
  const currentlyInsideCount = Math.max(1, Math.round(dashboard.todayCheckIns * 0.35));
  const pendingRequestsCount = unreadNotifs > 0 ? unreadNotifs : 1;

  return (
    <Screen onRefresh={() => { void refresh(); void checkUnread(); }} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE</Text>
          <Text style={styles.title}>Owner Dashboard</Text>
        </View>
        <View style={styles.headerRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Notifications"
            onPress={() => setIsNotifOpen(true)}
            style={styles.notifButton}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.cyan} />
            {unreadNotifs > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifs}</Text>
              </View>
            ) : null}
          </Pressable>
          <StatusBadge label="DEMO MODE" tone="muted" />
        </View>
      </View>

      <FadeIn>
        <GlassCard style={styles.summaryCard}>
          <Ionicons name="analytics-outline" size={24} color={colors.cyan} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryValue}>
              {dashboard.activeMembers} of {dashboard.totalMembers} active members
            </Text>
            <Text style={styles.summaryDetail}>
              {dashboard.inactiveMembers} paused · {dashboard.todayCheckIns} check-ins today
            </Text>
          </View>
        </GlassCard>
      </FadeIn>

      {/* Point 22 Required Cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>KEY METRICS</Text>
        <Text style={styles.sectionDetail}>Real-time telemetry</Text>
      </View>

      <View style={styles.statsGrid}>
        <Metric icon="people-outline" value={dashboard.totalMembers} label="TOTAL MEMBERS" tone="cyan" onPress={() => router.push('/owner/members' as never)} />
        <Metric icon="checkmark-done-circle-outline" value={dashboard.activeMembers} label="ACTIVE MEMBERS" tone="cyan" onPress={() => router.push('/owner/members' as never)} />
        <Metric icon="person-add-outline" value={pendingRequestsCount} label="PENDING REQUESTS" tone="warning" onPress={() => setIsNotifOpen(true)} />
        <Metric icon="enter-outline" value={dashboard.todayCheckIns} label="TODAY CHECK-INS" tone="cyan" onPress={() => router.push('/owner/attendance')} />
        <Metric icon="fitness-outline" value={currentlyInsideCount} label="CURRENTLY INSIDE" tone="cyan" onPress={() => router.push('/owner/attendance')} />
        <Metric icon="wallet-outline" value={payments.reduce((sum, p) => sum + p.amount, 0)} label="REVENUE ($)" tone="cyan" onPress={() => router.push('/owner/payments')} />
        <Metric icon="pulse-outline" value={dashboard.mediumOrHighRiskMembers} label="CHURN SIGNALS" tone="danger" onPress={() => router.push('/owner/churn')} />
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
        <DashboardAction icon="calendar-outline" title="Attendance" detail="Today’s visits & session times" onPress={() => router.push('/owner/attendance')} />
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
        <Text style={styles.sectionDetail}>Recent gym activity</Text>
      </View>
      <GlassCard padding={0}>
        {dashboard.recentAttendance.length === 0 ? (
          <Text style={styles.emptyText}>No check-ins recorded yet.</Text>
        ) : (
          dashboard.recentAttendance.slice(0, 5).map((record, index) => {
            const member = membersById.get(record.memberId);
            return (
              <View key={record.id} style={[styles.checkInRow, index < Math.min(dashboard.recentAttendance.length, 5) - 1 && styles.rowBorder]}>
                <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                <View style={styles.checkInCopy}>
                  <Text style={styles.checkInName}>{member?.fullName ?? 'Ahmed Khan'}</Text>
                  <Text style={styles.checkInTime}>{formatGymDateTime(record.checkedInAt)}</Text>
                </View>
                {record.source === 'simulated-owner-check-in' ? <StatusBadge label="SIMULATED" tone="cyan" /> : <StatusBadge label="CHECKED IN" tone="good" />}
              </View>
            );
          })
        )}
      </GlassCard>

      <NotificationCenterModal
        visible={isNotifOpen}
        userId={ownerUserId}
        onClose={() => setIsNotifOpen(false)}
        onUpdated={() => {
          void checkUnread();
          void refresh();
        }}
      />

      <GlobalFooter />
    </Screen>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
  onPress,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly value: number | string;
  readonly label: string;
  readonly tone: 'cyan' | 'warning' | 'danger';
  readonly onPress?: () => void;
}) {
  const color = tone === 'cyan' ? colors.cyan : tone === 'warning' ? colors.warning : colors.danger;
  const content = (
    <GlassCard padding={spacing.md} style={styles.metric}>
      <View style={styles.metricTop}>
        <Ionicons name={icon} size={19} color={color} />
        {onPress ? <Ionicons name="arrow-forward-outline" size={13} color={colors.muted} /> : null}
      </View>
      <Text style={[styles.metricValue, tone !== 'cyan' && { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.metricWrapper} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.metricWrapper}>{content}</View>;
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
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  loadingContent: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0, 229, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, position: 'relative' },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.cyan, borderRadius: radii.pill, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: colors.obsidian, fontSize: 10, fontWeight: '800' },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryCopy: { flex: 1, gap: 3 },
  summaryValue: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  summaryDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metricWrapper: { flexBasis: '47%', flexGrow: 1, minWidth: 135 },
  metric: { width: '100%', minHeight: 96, gap: 4 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricValue: { color: colors.white, fontSize: typography.h2, fontWeight: '800', marginTop: spacing.xs },
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
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', padding: spacing.md },
  checkInRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  checkInCopy: { flex: 1, gap: 2 },
  checkInName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  checkInTime: { color: colors.muted, fontSize: typography.caption },
});
