import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RiskBadge } from '@/components/gym/RiskBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, spacing, typography } from '@/theme';

export default function ChurnIntelligenceScreen() {
  const { status, members, insights, error, refresh } = useGymOwner();
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  if (status === 'loading') {
    return <Screen scroll={false}><LoadingState label="Calculating attendance signals…" /></Screen>;
  }
  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }

  const riskInsights = insights.filter((insight) => insight.riskLevel !== 'low');

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Churn Intelligence</Text>
        </View>
        <StatusBadge label={`${riskInsights.length} TO REVIEW`} tone="muted" />
      </View>

      <GlassCard style={styles.explainer}>
        <Ionicons name="information-circle-outline" size={21} color={colors.violet} />
        <Text style={styles.explainerText}>Attendance-based demo signal only. It is not a prediction and no action is automated.</Text>
      </GlassCard>

      {riskInsights.length === 0 ? (
        <GlassCard><Text style={styles.emptyText}>No members need an attendance review right now.</Text></GlassCard>
      ) : (
        <View style={styles.list}>
          {riskInsights.map((insight) => {
            const member = membersById.get(insight.memberId);
            if (!member) return null;
            const attendanceText = `${insight.checkInsLast30} visits in the last 30 days · ${insight.trend}`;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                accessibilityLabel={`View churn detail for ${member.fullName}`}
                onPress={() => router.push({ pathname: '/owner/members/[memberId]', params: { memberId: member.id } })}>
                <GlassCard padding={spacing.md} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.memberCopy}>
                      <Text style={styles.name}>{member.fullName}</Text>
                      <Text style={styles.goal}>{member.fitnessGoal}</Text>
                    </View>
                    <RiskBadge level={insight.riskLevel} score={insight.riskScore} />
                  </View>
                  <Text style={styles.attendance}>{attendanceText}</Text>
                  <View style={styles.drivers}>
                    {insight.drivers.slice(0, 2).map((driver) => (
                      <View key={driver} style={styles.driverRow}>
                        <Ionicons name="ellipse" size={7} color={colors.warning} />
                        <Text style={styles.driver}>{driver}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.detailLink}>Review member <Ionicons name="arrow-forward" size={14} color={colors.cyan} /></Text>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  explainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  explainerText: { flex: 1, color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  list: { gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  memberCopy: { flex: 1, gap: 3 },
  name: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  goal: { color: colors.muted, fontSize: typography.caption },
  attendance: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  drivers: { gap: 5 },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  driver: { flex: 1, color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  detailLink: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700', marginTop: spacing.xs },
  emptyText: { color: colors.silver, textAlign: 'center', fontSize: typography.body },
});
