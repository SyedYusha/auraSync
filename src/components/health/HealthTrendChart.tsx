import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import type { ManualHealthEntry } from '@/services/health/manualHealthDataService';
import { colors, spacing, typography } from '@/theme';

export function HealthTrendChart({ data, metric, label, unit }: {
  readonly data: readonly ManualHealthEntry[];
  readonly metric: 'hrv' | 'sleep' | 'sleepScore' | 'stress' | 'trainingLoad';
  readonly label: string;
  readonly unit: string;
}) {
  const points = data.slice(0, 7).reverse();
  if (points.length < 2) return null;
  const values = points.map((item) => item[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 300;
  const height = 120;
  const coords = values.map((value, index) => {
    const x = 10 + (index * (width - 20)) / (values.length - 1);
    const y = height - 20 - ((value - min) / range) * (height - 40);
    return { x, y, value };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.range}>{min}{unit} — {max}{unit}</Text>
        </View>
        <Text style={styles.latest}>{values[values.length - 1]}{unit}</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1="10" y1="20" x2={width - 10} y2="20" stroke="rgba(255,255,255,0.08)" />
        <Line x1="10" y1={height / 2} x2={width - 10} y2={height / 2} stroke="rgba(255,255,255,0.08)" />
        <Line x1="10" y1={height - 20} x2={width - 10} y2={height - 20} stroke="rgba(255,255,255,0.08)" />
        <Polyline points={polyline} fill="none" stroke={colors.cyan} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r="4" fill={colors.cyan} />)}
      </Svg>
      <View style={styles.axis}>
        {points.map((item) => <Text key={item.capturedAt} style={styles.axisText}>{new Date(item.capturedAt).toLocaleDateString(undefined, { weekday: 'short' })}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  range: { color: colors.muted, fontSize: 10, marginTop: 2 },
  latest: { color: colors.cyan, fontSize: typography.h2, fontWeight: '800' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  axisText: { color: colors.muted, fontSize: 10 },
});
