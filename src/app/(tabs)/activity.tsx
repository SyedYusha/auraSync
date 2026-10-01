import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WeeklyStepsChart } from '@/components/activity/WeeklyStepsChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { WeekDayActivity } from '@/types/member';

const DEMO_WEEK: readonly WeekDayActivity[] = [
  { day: 'Mon', steps: 8420 },
  { day: 'Tue', steps: 6850 },
  { day: 'Wed', steps: 10240 },
  { day: 'Thu', steps: 7920 },
  { day: 'Fri', steps: 9100 },
  { day: 'Sat', steps: 11200 },
  { day: 'Sun', steps: 6400 },
];

const DEMO_TODAY = { steps: 7920, caloriesBurned: 486, activeMinutes: 42 } as const;

interface StatConfig {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const { status: healthStatus, snapshot, error: healthError, refresh, isDemoMode, activityHistory } = useHealthData();
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);

  const loadWorkouts = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const workouts = await workoutService.getWorkouts(user.id);
      setWorkoutCount(workouts.filter((workout) => workout.status === 'Completed').length);
    } catch {
      setWorkoutCount(0);
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadWorkouts(); }, 0);
    return () => clearTimeout(timeout);
  }, [loadWorkouts]);

  const trainingLoad = snapshot?.metrics.trainingLoad.value ?? null;

  const latestManual = snapshot?.sourceId === 'manual' ? activityHistory[0] ?? null : null;
  const stats = useMemo<readonly StatConfig[]>(() => [
    { icon: 'footsteps-outline', label: 'Steps', value: isDemoMode ? DEMO_TODAY.steps.toLocaleString('en-US') : latestManual ? latestManual.steps.toLocaleString('en-US') : '—', detail: isDemoMode ? 'today' : latestManual ? 'self-entered' : 'not recorded' },
    { icon: 'flame-outline', label: 'Calories Burned', value: isDemoMode ? `${DEMO_TODAY.caloriesBurned}` : latestManual ? `${latestManual.caloriesBurned}` : '—', detail: 'kcal' },
    { icon: 'time-outline', label: 'Active Minutes', value: isDemoMode ? `${DEMO_TODAY.activeMinutes}` : latestManual ? `${latestManual.activeMinutes}` : '—', detail: 'min' },
    { icon: 'barbell-outline', label: 'Training Load', value: trainingLoad !== null ? `${trainingLoad}/100` : '—', detail: 'current' },
    { icon: 'checkmark-done-outline', label: 'Workouts Completed', value: workoutCount !== null ? `${workoutCount}` : '—', detail: 'all time' },
  ], [isDemoMode, latestManual, trainingLoad, workoutCount]);

  if (healthStatus === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={healthError ?? 'Please try again.'} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  const chartData = isDemoMode ? DEMO_WEEK : activityHistory.slice(0, 7).reverse().map((entry, index) => ({ day: new Date(entry.capturedAt).toLocaleDateString(undefined, { weekday: 'short' }), steps: entry.steps }));
  const weeklyTotal = chartData.reduce((total, day) => total + day.steps, 0);
  const weeklyAverage = chartData.length ? Math.round(weeklyTotal / chartData.length) : 0;

  return (
    <Screen onRefresh={() => { void refresh(); void loadWorkouts(); }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.subtitle}>Daily movement & training volume</Text>
        </View>
        <StatusBadge label="PERSONAL ACTIVITY" tone="cyan" />
      </View>

      <GlassCard style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.sectionTitle}>TODAY’S ACTIVITY</Text>
          <StatusBadge label={isDemoMode ? "SYNTHETIC DATA" : "PERSONAL DATA"} tone="muted" />
        </View>
        <View style={styles.statGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCell}>
              <View style={styles.statIconWrap}>
                <Ionicons name={stat.icon} size={18} color={colors.cyan} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statDetail}>{stat.detail}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.weekCard}>
        <View style={styles.weekHeader}>
          <Text style={styles.sectionTitle}>WEEKLY STEPS</Text>
          <View style={styles.weekTotals}>
            <Text style={styles.weekTotal}>{weeklyTotal.toLocaleString('en-US')} total</Text>
            <Text style={styles.weekAverage}>avg {weeklyAverage.toLocaleString('en-US')}/day</Text>
          </View>
        </View>
        {chartData.length > 0 ? <WeeklyStepsChart data={chartData} /> : <Text style={styles.weekNote}>No activity data recorded yet. Enter your health data to start building charts.</Text>}
        <Text style={styles.weekNote}>{isDemoMode ? "Demo activity for presentation." : "Self-entered activity is shown here until a health source is connected."}</Text>
      </GlassCard>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View training history"
        onPress={() => router.push('/history')}
        style={styles.historyButton}>
        <View style={styles.historyCopy}>
          <Text style={styles.historyTitle}>Training History</Text>
          <Text style={styles.historySubtitle}>See all past sessions and progress</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.cyan} />
      </Pressable>

      <Pressable onPress={() => router.push('/reports')} style={styles.buildButton}><Text style={styles.buildButtonText}>View Reports</Text><Ionicons name="analytics-outline" size={18} color={colors.cyan} /></Pressable>
      <Pressable onPress={() => router.push('/manual-health')} style={styles.buildButton}><Text style={styles.buildButtonText}>Enter Health Data</Text><Ionicons name="create-outline" size={18} color={colors.cyan} /></Pressable>
      <Pressable onPress={() => router.push('/workout-builder')} style={styles.buildButton}><Text style={styles.buildButtonText}>Build a Workout</Text><Ionicons name="chevron-forward" size={18} color={colors.cyan} /></Pressable>
      <Text style={styles.disclaimer}>AuraSync+ is a fitness and wellness prototype, not a medical device or medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.caption, marginTop: 3 },
  todayCard: { gap: spacing.md },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700', letterSpacing: 0.4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCell: { flexBasis: '47%', flexGrow: 1, minWidth: 130, backgroundColor: 'rgba(6, 35, 38, 0.55)', borderRadius: radii.sm, padding: spacing.sm, alignItems: 'center', gap: 4 },
  statIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 229, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.white, fontSize: typography.h2, fontWeight: '800' },
  statLabel: { color: colors.silver, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  statDetail: { color: colors.muted, fontSize: 10 },
  weekCard: { gap: spacing.md },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  weekTotals: { alignItems: 'flex-end', gap: 2 },
  weekTotal: { color: colors.cyan, fontSize: typography.body, fontWeight: '700' },
  weekAverage: { color: colors.muted, fontSize: typography.caption },
  weekNote: { color: colors.muted, fontSize: 10, textAlign: 'center' },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    padding: spacing.lg,
  },
  historyCopy: { flex: 1, gap: 3 },
  historyTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  historySubtitle: { color: colors.silver, fontSize: typography.caption },
  buildButton: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1, borderColor:colors.glassBorder, backgroundColor:colors.glass, borderRadius:radii.lg, padding:spacing.lg },
  buildButtonText: { color:colors.white, fontSize:typography.title, fontWeight:'700' },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
