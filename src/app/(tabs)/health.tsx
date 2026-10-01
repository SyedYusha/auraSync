import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { MetricGrid } from '@/components/health/MetricCard';
import { HealthTrendChart } from '@/components/health/HealthTrendChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import type { ManualHealthEntry } from '@/services/health/manualHealthDataService';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { colors, spacing, typography } from '@/theme';

export default function HealthScreen() {
  const { status, snapshot, error, refresh, isDemoMode, activityHistory } = useHealthData();

  if (status === 'loading' || !snapshot) return <Screen scroll={false}><LoadingState label="Preparing your synthetic health overview…" /></Screen>;
  if (status === 'error') return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;

  return <HealthContent snapshot={snapshot} onRefresh={() => void refresh()} isDemoMode={isDemoMode} activityHistory={activityHistory} />;
}

function HealthContent({
  snapshot,
  onRefresh,
  isDemoMode,
  activityHistory,
}: {
  readonly snapshot: NonNullable<ReturnType<typeof useHealthData>['snapshot']>;
  readonly onRefresh: () => void;
  readonly isDemoMode: boolean;
  readonly activityHistory: readonly ManualHealthEntry[];
}) {
  const router = useRouter();
  const hasHealthData = snapshot.sourceId !== 'none';
  const recovery = useRecovery(snapshot);
  const metrics = Object.values(snapshot.metrics);

  return (
    <Screen onRefresh={onRefresh}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Health Metrics</Text>
          <Text style={styles.subtitle}>{isDemoMode ? "Demo readiness signals" : "Your personal readiness signals"}</Text>
        </View>
        <StatusBadge label={isDemoMode ? "DEMO" : snapshot.sourceId === "manual" ? "MANUAL" : "LIVE"} tone="cyan" />
      </View>
      <GlassCard style={styles.recoveryOverview}>
        <Text style={styles.overviewLabel}>RECOVERY</Text>
        {hasHealthData ? (
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{recovery.score}</Text>
            <View>
              <Text style={styles.readiness}>{recovery.readiness}</Text>
              <Text style={styles.fatigue}>Fatigue: {recovery.fatigueLevel}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyRecovery}>
            <Text style={styles.emptyScore}>—</Text>
            <View style={styles.emptyRecoveryCopy}>
              <Text style={styles.readiness}>Not enough data yet</Text>
              <Text style={styles.fatigue}>Add or sync health data to calculate readiness.</Text>
            </View>
          </View>
        )}
      </GlassCard>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>METRICS</Text>
        <Text style={styles.description}>{isDemoMode ? "Synthetic demo data for presentation." : snapshot.sourceId === "manual" ? "Self-entered data. Connect a wearable later for automatic syncing." : "No health source connected yet."}</Text>
      </View>
      <MetricGrid metrics={metrics} />
      {!isDemoMode ? <PrimaryButton label="UPDATE HEALTH DATA" onPress={() => router.push("/manual-health")} /> : null}
      {activityHistory.length > 1 ? <GlassCard style={styles.trendCard}><HealthTrendChart data={activityHistory} metric="hrv" label="HRV trend" unit=" ms" /><HealthTrendChart data={activityHistory} metric="sleep" label="Sleep trend" unit=" h" /><HealthTrendChart data={activityHistory} metric="stress" label="Stress trend" unit="" /></GlassCard> : null}
      {activityHistory.length > 0 ? <GlassCard style={styles.trendCard}>
        <Text style={styles.sectionTitle}>RECENT TREND</Text>
        <Text style={styles.description}>Last {Math.min(activityHistory.length, 7)} entries · newest first</Text>
        {activityHistory.slice(0, 7).reverse().map((entry) => <View key={entry.capturedAt} style={styles.trendRow}><Text style={styles.trendDate}>{new Date(entry.capturedAt).toLocaleDateString()}</Text><Text style={styles.trendValue}>HRV {entry.hrv} ms</Text><Text style={styles.trendValue}>Sleep {entry.sleep.toFixed(1)}h</Text><Text style={styles.trendValue}>Stress {entry.stress}</Text></View>)}
      </GlassCard> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, marginTop: 4 },
  recoveryOverview: { gap: spacing.xs },
  overviewLabel: { color: colors.cyan, fontSize: typography.label, letterSpacing: 0.7, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  emptyRecovery: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyRecoveryCopy: { flex: 1, gap: 3 },
  emptyScore: { color: colors.muted, fontSize: 52, fontWeight: '300' },
  score: { color: colors.white, fontSize: 52, fontWeight: '300' },
  readiness: { color: colors.success, fontSize: typography.h2, fontWeight: '700' },
  fatigue: { color: colors.silver, fontSize: typography.caption, marginTop: 3 },
  section: { gap: 5 },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  description: { color: colors.muted, fontSize: typography.caption, lineHeight: 18 },
  trendCard: { gap: spacing.sm },
  trendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  trendDate: { color: colors.silver, fontSize: 11, width: 82 },
  trendValue: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
