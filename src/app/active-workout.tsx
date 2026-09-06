import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { useWorkoutPlan } from '@/state/WorkoutPlanProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { WorkoutStatus } from '@/types/member';

const CALORIES_PER_MINUTE: Record<string, number> = {
  high: 11.8,
  moderate: 11.4,
  low: 9.5,
};

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const { user } = useAuth();
  const { status: planStatus, plan } = useWorkoutPlan();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!plan) {
      return;
    }
    const timeout = setTimeout(() => setCompletedSets(plan.exercises.map(() => 0)), 0);
    return () => clearTimeout(timeout);
  }, [plan]);

  useEffect(() => {
    if (!plan || isPaused || isFinishing) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [plan, isPaused, isFinishing]);

  const totals = useMemo(() => {
    if (!plan) {
      return { totalSets: 0, completedTotal: 0 };
    }
    const totalSets = plan.exercises.reduce((total, exercise) => total + exercise.sets, 0);
    const completedTotal = completedSets.reduce((total, count) => total + count, 0);
    return { totalSets, completedTotal };
  }, [plan, completedSets]);

  if (planStatus === 'loading' || !plan || completedSets.length !== plan.exercises.length) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  const currentExercise = plan.exercises[exerciseIndex] ?? plan.exercises[0];
  if (!currentExercise) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }
  const nextExercise = plan.exercises[exerciseIndex + 1] ?? null;
  const currentCompleted = completedSets[exerciseIndex] ?? 0;
  const setsRemaining = currentExercise.sets - currentCompleted;
  const allSetsDone = totals.completedTotal >= totals.totalSets;

  const handleCompleteSet = () => {
    if (setsRemaining <= 0) {
      return;
    }
    setCompletedSets((current) => current.map((count, index) => (index === exerciseIndex ? count + 1 : count)));
  };

  const handleNextExercise = () => {
    if (exerciseIndex < plan.exercises.length - 1) {
      setExerciseIndex((current) => current + 1);
    }
  };

  const handleFinish = async () => {
    if (finishedRef.current || !user) {
      return;
    }
    finishedRef.current = true;
    setIsFinishing(true);

    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const multiplier = CALORIES_PER_MINUTE[plan.intensity.toLowerCase()] ?? 11;
    const status: WorkoutStatus = allSetsDone ? 'Completed' : 'Partial';

    try {
      await workoutService.saveWorkout(user.id, {
        id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        date: new Date().toISOString(),
        type: plan.title,
        durationMin,
        intensity: plan.intensity,
        focus: plan.focus,
        calories: Math.round(durationMin * multiplier),
        exercises: plan.exercises,
        status,
      });
    } catch {
      // History remains viewable; surface nothing blocking here.
    } finally {
      router.replace('/history');
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="close" size={26} color={colors.silver} onPress={handleFinish} accessibilityLabel="Finish workout" />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ACTIVE WORKOUT</Text>
          <Text style={styles.title}>{plan.title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume timer' : 'Pause timer'}
          onPress={() => setIsPaused((current) => !current)}
          style={styles.pauseButton}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color={colors.obsidian} />
        </Pressable>
      </View>

      <GlassCard style={styles.timerCard}>
        <Text style={styles.timer}>{formatClock(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>{isPaused ? 'PAUSED' : 'ELAPSED TIME'}</Text>
        <Text style={styles.progress}>
          {totals.completedTotal}/{totals.totalSets} sets completed
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totals.totalSets === 0 ? 0 : (totals.completedTotal / totals.totalSets) * 100}%` }]} />
        </View>
      </GlassCard>

      <GlassCard style={styles.currentCard}>
        <View style={styles.currentHeader}>
          <StatusBadge label={`EXERCISE ${exerciseIndex + 1} OF ${plan.exercises.length}`} tone="cyan" />
          {allSetsDone ? <StatusBadge label="ALL SETS DONE" tone="good" /> : null}
        </View>
        <Text style={styles.currentName}>{currentExercise.name}</Text>
        <View style={styles.setRow}>
          <View style={styles.setCell}>
            <Text style={styles.setLabel}>SET</Text>
            <Text style={styles.setValue}>
              {Math.min(currentCompleted + 1, currentExercise.sets)} / {currentExercise.sets}
            </Text>
          </View>
          <View style={styles.setDivider} />
          <View style={styles.setCell}>
            <Text style={styles.setLabel}>TARGET REPS</Text>
            <Text style={styles.setValue}>{currentExercise.reps}</Text>
          </View>
          <View style={styles.setDivider} />
          <View style={styles.setCell}>
            <Text style={styles.setLabel}>REMAINING</Text>
            <Text style={styles.setValue}>{Math.max(0, setsRemaining)}</Text>
          </View>
        </View>
        <View style={styles.setDots}>
          {Array.from({ length: currentExercise.sets }).map((_, setNumber) => (
            <View key={setNumber} style={[styles.setDot, setNumber < currentCompleted && styles.setDotDone]} />
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.nextCard}>
        <Text style={styles.nextLabel}>NEXT UP</Text>
        <Text style={styles.nextName}>{nextExercise ? `${nextExercise.name} — ${nextExercise.sets} × ${nextExercise.reps}` : 'Final exercise — finish strong!'}</Text>
      </GlassCard>

      <View style={styles.actions}>
        <PrimaryButton label={setsRemaining > 0 ? 'Complete Set' : 'Set Complete'} onPress={handleCompleteSet} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next exercise"
          onPress={handleNextExercise}
          disabled={exerciseIndex >= plan.exercises.length - 1}
          style={[styles.secondaryButton, exerciseIndex >= plan.exercises.length - 1 && styles.secondaryDisabled]}>
          <Text style={[styles.secondaryLabel, exerciseIndex >= plan.exercises.length - 1 && styles.secondaryLabelDisabled]}>Next Exercise</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish workout"
          onPress={handleFinish}
          disabled={isFinishing}
          style={[styles.finishButton, isFinishing && styles.secondaryDisabled]}>
          <Text style={styles.finishLabel}>{isFinishing ? 'Saving…' : 'Finish Workout'}</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>Finishing saves this session to your training history.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h2, fontWeight: '700', marginTop: 2 },
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCard: { alignItems: 'center', gap: 6, paddingVertical: spacing.lg },
  timer: { color: colors.white, fontSize: 52, fontWeight: '800', letterSpacing: 2 },
  timerLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  progress: { color: colors.silver, fontSize: typography.caption, marginTop: spacing.xs },
  progressBar: { width: '100%', height: 6, borderRadius: radii.pill, backgroundColor: 'rgba(166, 178, 184, 0.15)', overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.cyan },
  currentCard: { gap: spacing.sm },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentName: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  setCell: { flex: 1, alignItems: 'center', gap: 3 },
  setLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '700', letterSpacing: 0.5 },
  setValue: { color: colors.white, fontSize: typography.h2, fontWeight: '800' },
  setDivider: { width: 1, height: 30, backgroundColor: colors.line },
  setDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.xs },
  setDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(166, 178, 184, 0.2)', borderWidth: 1, borderColor: colors.line },
  setDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  nextCard: { gap: 4 },
  nextLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  nextName: { color: colors.silver, fontSize: typography.body, fontWeight: '600' },
  actions: { gap: spacing.sm },
  secondaryButton: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(11, 58, 61, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryDisabled: { opacity: 0.45 },
  secondaryLabel: { color: colors.cyan, fontSize: typography.title, fontWeight: '800' },
  secondaryLabelDisabled: { color: colors.muted },
  finishButton: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishLabel: { color: colors.danger, fontSize: typography.title, fontWeight: '800' },
  disclaimer: { color: colors.muted, fontSize: 10, textAlign: 'center' },
});
