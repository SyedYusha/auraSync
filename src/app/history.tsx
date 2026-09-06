import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';
import type { WorkoutRecord } from '@/types/member';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUMMARY_REFERENCE_TIME = Date.now();

function formatDay(dateIso: string): string {
  const date = new Date(dateIso);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${month} ${date.getDate()}`;
}

function intensityTone(intensity: string): 'cyan' | 'good' | 'muted' {
  if (intensity.toLowerCase() === 'high') return 'cyan';
  if (intensity.toLowerCase() === 'moderate') return 'good';
  return 'muted';
}

interface Summary {
  readonly count: number;
  readonly minutes: number;
  readonly calories: number;
}

function summarise(workouts: readonly WorkoutRecord[], sinceMs: number): Summary {
  const relevant = workouts.filter((workout) => new Date(workout.date).getTime() >= sinceMs);
  return {
    count: relevant.length,
    minutes: relevant.reduce((total, workout) => total + workout.durationMin, 0),
    calories: relevant.reduce((total, workout) => total + workout.calories, 0),
  };
}

export default function TrainingHistoryScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [workouts, setWorkouts] = useState<readonly WorkoutRecord[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    setStatus('loading');
    try {
      const records = await workoutService.getWorkouts(user.id);
      setWorkouts(records);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const week = summarise(workouts, SUMMARY_REFERENCE_TIME - 7 * DAY_MS);
  const month = summarise(workouts, SUMMARY_REFERENCE_TIME - 30 * DAY_MS);

  return (
    <Screen onRefresh={() => void load()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.cyan} onPress={() => router.back()} accessibilityLabel="Go back" />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR TRAINING</Text>
          <Text style={styles.title}>Training History</Text>
        </View>
      </View>

      {status === 'loading' ? (
        <LoadingState label="Loading your training history..." />
      ) : status === 'error' ? (
        <ErrorState message="Your history could not be loaded." onRetry={() => void load()} />
      ) : (
        <View style={styles.body}>
          <View style={styles.summaryRow}>
            <GlassCard style={styles.summaryCard} padding={spacing.md}>
              <Text style={styles.summaryLabel}>THIS WEEK</Text>
              <Text style={styles.summaryValue}>{week.count} workouts</Text>
              <Text style={styles.summaryDetail}>
                {week.minutes} min · {week.calories} kcal
              </Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard} padding={spacing.md}>
              <Text style={styles.summaryLabel}>THIS MONTH</Text>
              <Text style={styles.summaryValue}>{month.count} workouts</Text>
              <Text style={styles.summaryDetail}>
                {month.minutes} min · {month.calories} kcal
              </Text>
            </GlassCard>
          </View>

          {workouts.length === 0 ? (
            <GlassCard>
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptyText}>Start today’s AI plan from the Home screen and your sessions will appear here.</Text>
            </GlassCard>
          ) : (
            <View style={styles.list}>
              {workouts.map((workout) => (
                <GlassCard key={workout.id} style={styles.workoutCard} padding={spacing.md}>
                  <View style={styles.workoutHeader}>
                    <View>
                      <Text style={styles.workoutType}>{workout.type}</Text>
                      <Text style={styles.workoutDate}>{formatDay(workout.date)}</Text>
                    </View>
                    <StatusBadge label={workout.status} tone={workout.status === 'Completed' ? 'good' : 'muted'} />
                  </View>
                  <View style={styles.workoutMeta}>
                    <StatusBadge label={`${workout.durationMin} min`} tone="muted" />
                    <StatusBadge label={workout.intensity} tone={intensityTone(workout.intensity)} />
                    <StatusBadge label={`${workout.calories} kcal`} tone="muted" />
                  </View>
                  <Text style={styles.workoutFocus}>{workout.focus}</Text>
                  <View style={styles.exerciseWrap}>
                    {workout.exercises.map((exercise, index) => (
                      <Text key={`${workout.id}-${index}`} style={styles.exerciseLine}>
                        {exercise.name} {exercise.sets}×{exercise.reps}
                      </Text>
                    ))}
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
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
  body: { gap: spacing.lg },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, gap: 4 },
  summaryLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  summaryValue: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  summaryDetail: { color: colors.silver, fontSize: typography.caption },
  list: { gap: spacing.sm },
  workoutCard: { gap: spacing.sm },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workoutType: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  workoutDate: { color: colors.muted, fontSize: typography.caption, marginTop: 2, letterSpacing: 0.5 },
  workoutMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  workoutFocus: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  exerciseWrap: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: 3 },
  exerciseLine: { color: colors.silver, fontSize: typography.caption },
  emptyTitle: { color: colors.white, fontSize: typography.h2, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 20 },
});
