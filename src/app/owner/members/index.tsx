import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MembershipStateBadge, PaymentStateBadge } from '@/components/gym/MembershipBadge';
import { NotificationCenterModal } from '@/components/gym/NotificationCenterModal';
import { RiskBadge } from '@/components/gym/RiskBadge';
import { SimulatedCheckInButton } from '@/components/gym/SimulatedCheckInButton';
import { FadeIn, SkeletonBlock } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { formatGymDate, formatGymDateTime } from '@/domain/gym/format';
import { getMembershipState, getPaymentState } from '@/domain/gym/membership';
import { notificationService } from '@/services/notifications/notificationService';
import { useAuth } from '@/state/AuthProvider';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { ChurnInsight, GymMember, MembershipState, PaymentState } from '@/types/gym';
import { exportCsvFile } from '@/utils/csvExport';

type MembershipFilter = MembershipState | 'all';
type PaymentFilter = PaymentState | 'all';

const MEMBERSHIP_FILTERS: readonly { readonly value: MembershipFilter; readonly label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
];

const PAYMENT_FILTERS: readonly { readonly value: PaymentFilter; readonly label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
];

export default function GymMembersScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user } = useAuth();
  const { status, members, insights, checkedInTodayMemberIds, checkingInMemberId, error, refresh, simulateCheckIn } = useGymOwner();
  const [query, setQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [isExporting, setIsExporting] = useState(false);
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

  const insightsByMemberId = useMemo(() => new Map(insights.map((insight) => [insight.memberId, insight])), [insights]);

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (needle && !`${member.fullName} ${member.email} ${member.phone}`.toLowerCase().includes(needle)) return false;
      if (membershipFilter !== 'all' && getMembershipState(member) !== membershipFilter) return false;
      if (paymentFilter !== 'all' && getPaymentState(member) !== paymentFilter) return false;
      return true;
    });
  }, [members, membershipFilter, paymentFilter, query]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const headers = ['Member ID', 'Full Name', 'Email', 'Phone', 'Plan', 'State', 'Payment State', 'Joined At', 'Expires At', 'Last Check-In'];
      const rows = visibleMembers.map((m) => [
        m.id,
        m.fullName,
        m.email,
        m.phone,
        m.plan,
        getMembershipState(m),
        getPaymentState(m),
        m.joinedAt,
        m.membershipExpiresAt,
        insightsByMemberId.get(m.id)?.lastCheckInAt ?? 'Never',
      ]);
      await exportCsvFile('aurasync_members.csv', headers, rows);
    } finally {
      setIsExporting(false);
    }
  };

  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }

  if (status === 'loading') {
    return (
      <Screen scroll={false} contentStyle={styles.skeletonContent}>
        <SkeletonBlock height={52} />
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} height={116} />
        ))}
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => { void refresh(); void checkUnread(); }} contentStyle={styles.content}>
      <FadeIn>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
            <Ionicons name="arrow-back" size={24} color={colors.cyan} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GYM INTELLIGENCE</Text>
            <Text style={styles.title}>Members</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Notifications"
              onPress={() => setIsNotifOpen(true)}
              style={styles.notifButton}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.cyan} />
              {unreadNotifs > 0 ? (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifs}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export CSV"
              onPress={() => void handleExportCsv()}
              disabled={isExporting}
              style={styles.exportBtn}
            >
              <Ionicons name="download-outline" size={15} color={colors.cyan} />
              <Text style={styles.exportBtnText}>{isExporting ? '...' : 'CSV'}</Text>
            </Pressable>
            <StatusBadge label={`${members.length} MEMBERS`} tone="muted" />
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={50}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email or phone"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {MEMBERSHIP_FILTERS.map((filter) => (
            <FilterChip key={filter.value} label={filter.label} active={membershipFilter === filter.value} onPress={() => setMembershipFilter(filter.value)} />
          ))}
        </View>
        <View style={styles.filterRow}>
          {PAYMENT_FILTERS.map((filter) => (
            <FilterChip key={filter.value} label={filter.label} active={paymentFilter === filter.value} onPress={() => setPaymentFilter(filter.value)} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add member"
          onPress={() => router.push('/owner/members/add' as never)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <Ionicons name="person-add-outline" size={18} color={colors.cyan} />
          <Text style={styles.addButtonLabel}>Add member</Text>
        </Pressable>
      </FadeIn>

      {visibleMembers.length === 0 ? (
        <GlassCard>
          <Text style={styles.emptyText}>
            {members.length === 0 ? 'No members yet. Add your first member.' : 'No members match the current search or filters.'}
          </Text>
        </GlassCard>
      ) : isDesktop ? (
        /* Point 8: Actual Desktop Table */
        <GlassCard padding={0} style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, { flex: 2 }]}>MEMBER</Text>
            <Text style={[styles.thCell, { width: 100 }]}>STATUS</Text>
            <Text style={[styles.thCell, { width: 110 }]}>MEMBERSHIP</Text>
            <Text style={[styles.thCell, { width: 90 }]}>PAYMENT</Text>
            <Text style={[styles.thCell, { width: 160 }]}>LAST CHECK-IN</Text>
            <Text style={[styles.thCell, { width: 100 }]}>ATTENDANCE</Text>
            <Text style={[styles.thCell, { width: 130, textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          {visibleMembers.map((member, index) => {
            const insight = insightsByMemberId.get(member.id);
            const mState = getMembershipState(member);
            const pState = getPaymentState(member);
            const isLast = index === visibleMembers.length - 1;
            const checkedInToday = checkedInTodayMemberIds.has(member.id);

            return (
              <View key={member.id} style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
                <View style={[styles.tdCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>{member.fullName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tableName} numberOfLines={1}>{member.fullName}</Text>
                    <Text style={styles.tableSub} numberOfLines={1}>{member.email}</Text>
                  </View>
                </View>

                <View style={[styles.tdCell, { width: 100 }]}>
                  <MembershipStateBadge state={mState} />
                </View>

                <View style={[styles.tdCell, { width: 110 }]}>
                  <Text style={styles.tableValueText}>{member.plan.replace(' Monthly', '')}</Text>
                </View>

                <View style={[styles.tdCell, { width: 90 }]}>
                  <PaymentStateBadge state={pState} />
                </View>

                <View style={[styles.tdCell, { width: 160 }]}>
                  <Text style={styles.tableSub}>
                    {insight?.lastCheckInAt ? formatGymDateTime(insight.lastCheckInAt) : 'Never'}
                  </Text>
                </View>

                <View style={[styles.tdCell, { width: 100 }]}>
                  <Text style={styles.tableValueText}>
                    {checkedInToday ? 'Today' : insight?.checkInsLast30 ? `${insight.checkInsLast30} visits` : '—'}
                  </Text>
                </View>

                <View style={[styles.tdCell, { width: 130, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${member.fullName}`}
                    onPress={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}
                    style={styles.actionBtnSmall}
                  >
                    <Text style={styles.actionBtnSmallText}>View</Text>
                  </Pressable>
                  {member.isActive ? (
                    <Pressable
                      disabled={checkedInToday || checkingInMemberId === member.id}
                      onPress={() => void simulateCheckIn(member.id)}
                      style={[styles.actionBtnSmall, checkedInToday && styles.actionBtnDone]}
                    >
                      <Text style={[styles.actionBtnSmallText, checkedInToday && styles.actionBtnDoneText]}>
                        {checkingInMemberId === member.id ? '...' : checkedInToday ? 'In' : 'Check In'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        /* Point 8: Mobile Stacked Cards */
        <View style={styles.list}>
          {visibleMembers.map((member, index) => (
            <MemberCard
              key={member.id}
              member={member}
              index={index}
              insight={insightsByMemberId.get(member.id)}
              checkedInToday={checkedInTodayMemberIds.has(member.id)}
              isLoading={checkingInMemberId === member.id}
              onPressDetail={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}
              onCheckIn={() => void simulateCheckIn(member.id)}
            />
          ))}
        </View>
      )}

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

interface MemberCardProps {
  readonly member: GymMember;
  readonly index: number;
  readonly insight?: ChurnInsight;
  readonly checkedInToday: boolean;
  readonly isLoading: boolean;
  readonly onPressDetail: () => void;
  readonly onCheckIn: () => void;
}

function MemberCard({ member, index, insight, checkedInToday, isLoading, onPressDetail, onCheckIn }: MemberCardProps) {
  const detail = member.isActive
    ? `${member.fitnessGoal} · Last visit ${formatGymDate(insight?.lastCheckInAt ?? null)}`
    : `${member.fitnessGoal} · Membership paused`;

  return (
    <FadeIn delay={Math.min(index * 40, 240)} duration={240}>
      <GlassCard padding={spacing.md} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${member.fullName}`} onPress={onPressDetail} style={styles.memberPressable}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{member.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.memberCopy}>
            <Text style={styles.name}>{member.fullName}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
          {member.isActive && insight ? <RiskBadge level={insight.riskLevel} score={insight.riskScore} /> : <StatusBadge label="PAUSED" tone="muted" />}
        </Pressable>
        <View style={styles.actions}>
          <View style={styles.badgeWrap}>
            <MembershipStateBadge state={getMembershipState(member)} />
            <PaymentStateBadge state={getPaymentState(member)} />
          </View>
          {member.isActive ? (
            <View style={styles.buttonWrap}>
              <SimulatedCheckInButton checkedInToday={checkedInToday} isLoading={isLoading} onPress={onCheckIn} />
            </View>
          ) : null}
        </View>
      </GlassCard>
    </FadeIn>
  );
}

function FilterChip({ label, active, onPress }: { readonly label: string; readonly active: boolean; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  skeletonContent: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  notifButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 229, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, position: 'relative' },
  notifBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: colors.cyan, borderRadius: radii.pill, paddingHorizontal: 4, paddingVertical: 1, minWidth: 15, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: colors.obsidian, fontSize: 9, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(6, 35, 38, 0.6)',
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: typography.body, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(6, 35, 38, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipActive: { borderColor: 'rgba(0, 229, 255, 0.45)', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  chipLabel: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  chipLabelActive: { color: colors.cyan },
  addButton: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.32)',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  addButtonLabel: { color: colors.cyan, fontSize: typography.caption, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  list: { gap: spacing.sm },
  card: { gap: spacing.md },
  memberPressable: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.techTeal, borderWidth: 1, borderColor: colors.cyan },
  avatarText: { color: colors.cyan, fontSize: typography.title, fontWeight: '800' },
  memberCopy: { flex: 1, gap: 3 },
  name: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  exportBtnText: { color: colors.cyan, fontSize: 11, fontWeight: '800' },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  buttonWrap: { flexShrink: 1 },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 20 },

  // Desktop Table
  tableCard: { overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  thCell: { color: colors.muted, fontSize: typography.label, fontWeight: '700' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  tdCell: { justifyContent: 'center' },
  avatarMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.techTeal, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cyan },
  avatarMiniText: { color: colors.cyan, fontSize: 11, fontWeight: '800' },
  tableName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  tableSub: { color: colors.silver, fontSize: typography.caption },
  tableValueText: { color: colors.white, fontSize: typography.caption, fontWeight: '600' },
  actionBtnSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.sm, backgroundColor: 'rgba(0, 229, 255, 0.12)', borderWidth: 1, borderColor: colors.cyan },
  actionBtnSmallText: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  actionBtnDone: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.line },
  actionBtnDoneText: { color: colors.muted },
});
