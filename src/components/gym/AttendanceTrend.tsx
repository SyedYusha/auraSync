import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';
import type { AttendanceDay } from '@/types/gym';

interface AttendanceTrendProps {
  readonly data: readonly AttendanceDay[];
}

export function AttendanceTrend({ data }: AttendanceTrendProps) {
  const maxCount = Math.max(...data.map((day) => day.count), 1);

  return (
    <View style={styles.chart}>
      {data.map((day) => {
        const isMax = day.count === maxCount && day.count > 0;
        const height = Math.max(8, Math.round((day.count / maxCount) * 112));
        return (
          <View key={day.label} style={styles.column}>
            <Text style={[styles.value, isMax && styles.highlight]}>{day.count}</Text>
            <View style={[styles.bar, { height }, isMax && styles.barHighlight]} />
            <Text style={[styles.label, isMax && styles.highlight]}>{day.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: spacing.sm },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  value: { color: colors.muted, fontSize: typography.caption, fontWeight: '700' },
  bar: { width: 20, borderRadius: radii.sm, backgroundColor: 'rgba(0, 229, 255, 0.22)' },
  barHighlight: { backgroundColor: colors.cyan },
  label: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  highlight: { color: colors.cyan },
});
