import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';
import type { WeekDayActivity } from '@/types/member';

interface WeeklyStepsChartProps {
  readonly data: readonly WeekDayActivity[];
}

const BAR_HEIGHT = 130;

export function WeeklyStepsChart({ data }: WeeklyStepsChartProps) {
  const maxSteps = Math.max(...data.map((day) => day.steps), 1);

  return (
    <View style={styles.chart}>
      {data.map((day) => {
        const barHeight = Math.max(6, Math.round((day.steps / maxSteps) * BAR_HEIGHT));
        const isMax = day.steps === maxSteps;
        return (
          <View key={day.day} style={styles.column}>
            <Text style={styles.value}>{(day.steps / 1000).toFixed(1)}k</Text>
            <View style={[styles.bar, { height: barHeight }, isMax && styles.barMax]} />
            <Text style={[styles.dayLabel, isMax && styles.dayLabelMax]}>{day.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: spacing.sm },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  value: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  bar: { width: 22, borderRadius: radii.sm, backgroundColor: 'rgba(0, 229, 255, 0.22)' },
  barMax: { backgroundColor: colors.cyan },
  dayLabel: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  dayLabelMax: { color: colors.cyan },
});
