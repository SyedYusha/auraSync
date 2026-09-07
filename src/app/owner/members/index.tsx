import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MembershipStateBadge, PaymentStateBadge } from '@/components/gym/MembershipBadge';
import { RiskBadge } from '@/components/gym/RiskBadge';
import { SimulatedCheckInButton } from '@/components/gym/SimulatedCheckInButton';
import { FadeIn, SkeletonBlock } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { formatGymDate } from '@/domain/gym/format';
import { getMembershipState, getPaymentState } from '@/domain/gym/membership';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { ChurnInsight, GymMember, MembershipState, PaymentState } from '@/types/gym';

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
  const { status, members, insights, checkedInTodayMemberIds, checkingInMemberId, error, refresh, simulateCheckIn } = useGymOwner();
  const [query, setQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

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
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <FadeIn>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
            <Ionicons name="arrow-back" size={24} color={colors.cyan} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
            <Text style={styles.title}>Members</Text>
          </View>
          <StatusBadge label={`${members.length} DEMO`} tone="muted" />
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
            {members.length === 0 ? 'No demo members yet. Add your first member.' : 'No members match the current search or filters.'}
          </Text>
        </GlassCard>
      ) : (
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
  content: { gap: spacing.lg },
  skeletonContent: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
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
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  buttonWrap: { flexShrink: 1 },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 20 },
});
