import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { HealthMetric } from '@/types/health';
import { colors, spacing, typography } from '@/theme';

import { GlassCard } from '../ui/GlassCard';

const iconNames: Record<HealthMetric['id'], keyof typeof Ionicons.glyphMap> = {
  heartRate: 'heart',
  hrv: 'pulse',
  sleep: 'moon',
  sleepScore: 'sparkles',
  stress: 'flame',
  trainingLoad: 'barbell',
};

const statusColors = {
  Optimal: colors.success,
  Normal: colors.cyan,
  Low: colors.success,
  Moderate: colors.warning,
  High: colors.danger,
} as const;

export function MetricCard({ metric }: { readonly metric: HealthMetric }) {
  return (
    <GlassCard style={styles.card} padding={spacing.md}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconNames[metric.id]} size={18} color={colors.cyan} />
        </View>
        <Text style={[styles.status, { color: statusColors[metric.status] }]}>{metric.status}</Text>
      </View>
      <Text style={styles.label}>{metric.label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{metric.value}</Text>
        <Text style={styles.unit}>{metric.unit}</Text>
      </View>
      <Text style={styles.detail}>{metric.detail}</Text>
    </GlassCard>
  );
}

export function MetricGrid({ metrics }: { readonly metrics: readonly HealthMetric[] }) {
  return <View style={styles.grid}>{metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { width: '48.5%', minHeight: 156, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  status: { fontSize: typography.label, fontWeight: '700' },
  label: { color: colors.silver, fontSize: typography.caption },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { color: colors.white, fontSize: 26, fontWeight: '700' },
  unit: { color: colors.silver, fontSize: typography.caption, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: typography.caption },
});
