import { StyleSheet, Text, View } from 'react-native';

import { MetricGrid } from '@/components/health/MetricCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { colors, spacing, typography } from '@/theme';

export default function HealthScreen() {
  const { status, snapshot, error, refresh } = useHealthData();

  if (status === 'loading' || !snapshot) return <Screen scroll={false}><LoadingState label="Preparing your synthetic health overview…" /></Screen>;
  if (status === 'error') return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;

  return <HealthContent snapshot={snapshot} onRefresh={() => void refresh()} />;
}

function HealthContent({ snapshot, onRefresh }: { readonly snapshot: NonNullable<ReturnType<typeof useHealthData>['snapshot']>; readonly onRefresh: () => void }) {
  const recovery = useRecovery(snapshot);
  const metrics = Object.values(snapshot.metrics);

  return (
    <Screen onRefresh={onRefresh}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Health Metrics</Text>
          <Text style={styles.subtitle}>Your synthetic readiness signals</Text>
        </View>
        <StatusBadge label="DEMO" tone="cyan" />
      </View>
      <GlassCard style={styles.recoveryOverview}>
        <Text style={styles.overviewLabel}>RECOVERY</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{recovery.score}</Text>
          <View>
            <Text style={styles.readiness}>{recovery.readiness}</Text>
            <Text style={styles.fatigue}>Fatigue: {recovery.fatigueLevel}</Text>
          </View>
        </View>
      </GlassCard>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>METRICS</Text>
        <Text style={styles.description}>Demo data only — no wearable or health platform is connected.</Text>
      </View>
      <MetricGrid metrics={metrics} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, marginTop: 4 },
  recoveryOverview: { gap: spacing.xs },
  overviewLabel: { color: colors.cyan, fontSize: typography.label, letterSpacing: 0.7, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { color: colors.white, fontSize: 52, fontWeight: '300' },
  readiness: { color: colors.success, fontSize: typography.h2, fontWeight: '700' },
  fatigue: { color: colors.silver, fontSize: typography.caption, marginTop: 3 },
  section: { gap: 5 },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  description: { color: colors.muted, fontSize: typography.caption, lineHeight: 18 },
});
