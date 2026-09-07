import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SimulatedCheckInButton } from '@/components/gym/SimulatedCheckInButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { formatGymDateTime } from '@/domain/gym/format';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, spacing, typography } from '@/theme';

export default function AttendanceScreen() {
  const { status, members, dashboard, checkedInTodayMemberIds, checkingInMemberId, error, refresh, simulateCheckIn } = useGymOwner();
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }
  if (status === 'loading' || !dashboard) {
    return <Screen scroll={false}><LoadingState label="Loading demo attendance…" /></Screen>;
  }

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Attendance</Text>
        </View>
        <StatusBadge label={`${dashboard.todayCheckIns} TODAY`} tone="good" />
      </View>

      <GlassCard style={styles.summaryCard}>
        <Ionicons name="enter-outline" size={24} color={colors.cyan} />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryValue}>{dashboard.todayCheckIns} simulated check-ins today</Text>
          <Text style={styles.summaryDetail}>A member can be checked in once per local calendar day.</Text>
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
      <GlassCard padding={0}>
        {dashboard.recentAttendance.map((record, index) => (
          <View key={record.id} style={[styles.activityRow, index < dashboard.recentAttendance.length - 1 && styles.rowBorder]}>
            <Ionicons name="checkmark-circle" size={19} color={colors.success} />
            <View style={styles.activityCopy}>
              <Text style={styles.activityName}>{membersById.get(record.memberId)?.fullName ?? 'Demo member'}</Text>
              <Text style={styles.activityTime}>{formatGymDateTime(record.checkedInAt)}</Text>
            </View>
            {record.source === 'simulated-owner-check-in' ? <StatusBadge label="SIMULATED" tone="cyan" /> : null}
          </View>
        ))}
      </GlassCard>

      <Text style={styles.sectionTitle}>SIMULATE A CHECK-IN</Text>
      <View style={styles.memberList}>
        {members.map((member) => (
          <GlassCard key={member.id} padding={spacing.md} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>{member.fullName}</Text>
                <Text style={styles.memberGoal}>{member.fitnessGoal}</Text>
              </View>
              <View style={styles.buttonWrap}>
                <SimulatedCheckInButton
                  checkedInToday={checkedInTodayMemberIds.has(member.id)}
                  isLoading={checkingInMemberId === member.id}
                  onPress={() => void simulateCheckIn(member.id)}
                />
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryCopy: { flex: 1, gap: 3 },
  summaryValue: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  summaryDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 17 },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  activityRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  activityCopy: { flex: 1, gap: 2 },
  activityName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  activityTime: { color: colors.muted, fontSize: typography.caption },
  memberList: { gap: spacing.sm },
  memberCard: { gap: spacing.sm },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  memberGoal: { color: colors.muted, fontSize: typography.caption },
  buttonWrap: { minWidth: 154 },
});
