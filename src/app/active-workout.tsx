import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { useWorkoutPlan } from '@/state/WorkoutPlanProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { ExerciseSet, PlannedExercise, WeightUnit, WorkoutRecord, WorkoutStatus } from '@/types/member';

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

interface ActiveExerciseState {
  readonly name: string;
  readonly category?: string;
  sets: ExerciseSet[];
}

export default function ActiveWorkoutScreen() {
  const { user } = useAuth();
  const { status: planStatus, plan } = useWorkoutPlan();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [customPlan, setCustomPlan] = useState<typeof plan>(null);
  const [exerciseStates, setExerciseStates] = useState<ActiveExerciseState[]>([]);
  const [unit, setUnit] = useState<WeightUnit>('kg');

  // Workout Completion Summary state
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [finalRecord, setFinalRecord] = useState<WorkoutRecord | null>(null);
  const workoutIdRef = useRef<string>('');

  // Load custom or AI selected workout
  useEffect(() => {
    const loadSelectedWorkout = async () => {
      const aiRaw = await AsyncStorage.getItem('aurasync_active_ai_workout');
      if (aiRaw) {
        try {
          const selected = JSON.parse(aiRaw) as typeof plan;
          if (selected?.exercises?.length) {
            setCustomPlan(selected);
            await AsyncStorage.removeItem('aurasync_active_ai_workout');
            return;
          }
        } catch {}
      }

      const raw = await AsyncStorage.getItem('aurasync_active_custom_workout');
      if (!raw) return;
      try {
        const items = JSON.parse(raw) as { name: string; sets: number; reps: number; category: string }[];
        if (!items.length) return;
        setCustomPlan({
          title: 'Custom Workout',
          intensity: 'Moderate',
          durationMin: Math.max(15, items.length * 8),
          focus: items.map((x) => x.category).filter((v, i, a) => a.indexOf(v) === i).join(' • '),
          reason: 'Built by you.',
          recoveryTip: 'Adjust intensity based on how you feel.',
          exercises: items,
          isFallback: false,
        });
      } catch {}
    };
    void loadSelectedWorkout();
  }, []);

  const activePlan = customPlan ?? plan;

  // Initialize detailed set tracking
  useEffect(() => {
    if (!activePlan?.exercises?.length) return;
    const initial: ActiveExerciseState[] = activePlan.exercises.map((ex) => {
      const setCount = Math.max(1, ex.sets || 3);
      const targetReps = ex.reps || 10;
      // Provide realistic default starting weight based on exercise type (e.g. Bench 40kg, Squat 50kg)
      const defaultWeight = ex.name.toLowerCase().includes('bodyweight') || ex.name.toLowerCase().includes('crunch') || ex.name.toLowerCase().includes('plank') ? null : 40;
      const sets: ExerciseSet[] = Array.from({ length: setCount }, (_, i) => ({
        setNumber: i + 1,
        reps: targetReps,
        weight: defaultWeight,
        unit: 'kg',
        completed: false,
      }));
      return {
        name: ex.name,
        category: (ex as { category?: string }).category,
        sets,
      };
    });
    const timeout = setTimeout(() => setExerciseStates(initial), 0);
    return () => clearTimeout(timeout);
  }, [activePlan]);

  // Rest timer
  useEffect(() => {
    if (restSeconds <= 0 || isFinishing) return;
    const timer = setInterval(() => setRestSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [restSeconds, isFinishing]);

  // Elapsed workout timer
  useEffect(() => {
    if (!activePlan || isPaused || isFinishing || isCompleteModalVisible) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activePlan, isPaused, isFinishing, isCompleteModalVisible]);

  // Overall workout totals
  const totals = useMemo(() => {
    let totalSets = 0;
    let completedSetsCount = 0;
    let totalRepsCount = 0;
    let totalVolumeSum = 0;
    let hasWeightedSets = false;

    for (const ex of exerciseStates) {
      for (const set of ex.sets) {
        totalSets += 1;
        if (set.completed) {
          completedSetsCount += 1;
          totalRepsCount += set.reps;
          if (set.weight != null && set.weight > 0) {
            hasWeightedSets = true;
            totalVolumeSum += set.weight * set.reps;
          }
        }
      }
    }

    return {
      totalSets,
      completedSetsCount,
      totalRepsCount,
      totalVolume: hasWeightedSets ? totalVolumeSum : null,
      allDone: totalSets > 0 && completedSetsCount >= totalSets,
    };
  }, [exerciseStates]);

  if ((!customPlan && planStatus === 'loading') || !activePlan || exerciseStates.length === 0) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  const currentExercise = exerciseStates[exerciseIndex] ?? exerciseStates[0];
  if (!currentExercise) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  // Set actions
  const handleToggleSetComplete = (setIndex: number) => {
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          const nextCompleted = !s.completed;
          if (nextCompleted) {
            setRestSeconds(60);
          }
          return { ...s, completed: nextCompleted };
        });
        return { ...ex, sets: updatedSets };
      }),
    );
  };

  const handleUpdateReps = (setIndex: number, delta: number) => {
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          const nextReps = Math.max(1, s.reps + delta);
          return { ...s, reps: nextReps };
        });
        return { ...ex, sets: updatedSets };
      }),
    );
  };

  const handleUpdateWeight = (setIndex: number, delta: number) => {
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          const currentWeight = s.weight ?? 0;
          const nextWeight = Math.max(0, currentWeight + delta);
          return { ...s, weight: nextWeight > 0 ? nextWeight : null };
        });
        return { ...ex, sets: updatedSets };
      }),
    );
  };

  const handleSetDirectWeight = (setIndex: number, text: string) => {
    const num = Number.parseFloat(text);
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          return { ...s, weight: Number.isFinite(num) && num > 0 ? num : null };
        });
        return { ...ex, sets: updatedSets };
      }),
    );
  };

  const handleAddSet = () => {
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: ExerciseSet = {
          setNumber: ex.sets.length + 1,
          reps: lastSet?.reps ?? 10,
          weight: lastSet?.weight ?? 40,
          unit,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    );
  };

  const handleRemoveSet = (setIndex: number) => {
    if (currentExercise.sets.length <= 1) return;
    setExerciseStates((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        const filtered = ex.sets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: filtered };
      }),
    );
  };

  const handleNextExercise = () => {
    if (exerciseIndex < exerciseStates.length - 1) {
      setExerciseIndex((current) => current + 1);
    }
  };

  const handlePrevExercise = () => {
    if (exerciseIndex > 0) {
      setExerciseIndex((current) => current - 1);
    }
  };

  // Trigger Workout Complete Summary
  const handleFinishPrompt = () => {
    if (!totals.allDone) {
      Alert.alert('Finish workout?', 'You have incomplete sets. Finish and save current progress?', [
        { text: 'Keep Training', style: 'cancel' },
        { text: 'Finish Workout', style: 'default', onPress: () => openCompletionSummary() },
      ]);
      return;
    }
    openCompletionSummary();
  };

  const openCompletionSummary = () => {
    if (!workoutIdRef.current) {
      workoutIdRef.current = `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    setIsFinishing(true);
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const multiplier = CALORIES_PER_MINUTE[activePlan.intensity.toLowerCase()] ?? 11;
    const status: WorkoutStatus = totals.allDone ? 'Completed' : 'Partial';

    const performedExercises: PlannedExercise[] = exerciseStates
      .map((ex) => {
        const completedSets = ex.sets.filter((s) => s.completed);
        const avgWeight = completedSets.length > 0 && completedSets.some((s) => s.weight != null)
          ? Math.round(completedSets.reduce((sum, s) => sum + (s.weight ?? 0), 0) / completedSets.length)
          : null;
        const avgReps = completedSets.length > 0
          ? Math.round(completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length)
          : 10;

        return {
          name: ex.name,
          sets: ex.sets.length,
          completedSets: completedSets.length,
          reps: avgReps,
          weight: avgWeight,
          unit,
          setDetails: ex.sets,
        };
      })
      .filter((ex) => (ex.completedSets ?? 0) > 0 || !totals.allDone);

    const record: WorkoutRecord = {
      id: workoutIdRef.current,
      date: new Date().toISOString(),
      type: activePlan.title,
      durationMin,
      intensity: activePlan.intensity,
      focus: activePlan.focus,
      calories: Math.round(durationMin * multiplier),
      exercises: performedExercises,
      status,
      totalVolume: totals.totalVolume,
      notes: personalNotes.trim() || null,
    };

    setFinalRecord(record);
    setIsCompleteModalVisible(true);
  };

  const handleSaveWorkout = async () => {
    if (!finalRecord) return;
    setIsSavingRecord(true);
    const targetUserId = user?.id ?? 'demo_user';
    const updatedRecord: WorkoutRecord = {
      ...finalRecord,
      notes: personalNotes.trim() || null,
    };

    try {
      await workoutService.saveWorkout(targetUserId, updatedRecord);
      setIsSavedSuccessfully(true);
      await AsyncStorage.multiRemove(['aurasync_active_custom_workout', 'aurasync_active_ai_workout']);
    } catch {
      // Saved in local cache automatically
      setIsSavedSuccessfully(true);
    } finally {
      setIsSavingRecord(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <Ionicons name="close" size={26} color={colors.silver} onPress={handleFinishPrompt} accessibilityLabel="Finish workout" />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ACTIVE WORKOUT</Text>
          <Text style={styles.title}>{activePlan.title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume timer' : 'Pause timer'}
          onPress={() => setIsPaused((current) => !current)}
          style={styles.pauseButton}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color={colors.obsidian} />
        </Pressable>
      </View>

      {/* Stats bar: Time, Rest, Sets, Total Volume */}
      <GlassCard style={styles.timerCard}>
        <View style={styles.timerRow}>
          <View style={styles.timerItem}>
            <Text style={styles.timer}>{formatClock(elapsedSeconds)}</Text>
            <Text style={styles.timerLabel}>{isPaused ? 'PAUSED' : 'ELAPSED'}</Text>
          </View>
          {restSeconds > 0 ? (
            <View style={styles.timerItem}>
              <Text style={styles.restTime}>{formatClock(restSeconds)}</Text>
              <Text style={styles.restLabel}>REST TIMER</Text>
            </View>
          ) : null}
          <View style={styles.timerItem}>
            <Text style={styles.volumeStat}>
              {totals.totalVolume != null ? `${totals.totalVolume.toLocaleString()} ${unit}` : '—'}
            </Text>
            <Text style={styles.volumeLabel}>
              {totals.totalVolume != null ? 'TRAINING VOLUME' : 'VOLUME UNAVAILABLE'}
            </Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {totals.completedSetsCount}/{totals.totalSets} sets completed
          </Text>
          <View style={styles.unitToggle}>
            <Pressable onPress={() => setUnit('kg')} style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}>
              <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
            </Pressable>
            <Pressable onPress={() => setUnit('lbs')} style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnActive]}>
              <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>lbs</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${totals.totalSets === 0 ? 0 : (totals.completedSetsCount / totals.totalSets) * 100}%` },
            ]}
          />
        </View>
      </GlassCard>

      {/* Current Exercise Card with Set-by-Set Weight Tracking */}
      <GlassCard style={styles.currentCard}>
        <View style={styles.currentHeader}>
          <StatusBadge label={`EXERCISE ${exerciseIndex + 1} OF ${exerciseStates.length}`} tone="cyan" />
          <View style={styles.navRow}>
            <Pressable onPress={handlePrevExercise} disabled={exerciseIndex === 0} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={exerciseIndex === 0 ? colors.muted : colors.cyan} />
            </Pressable>
            <Pressable onPress={handleNextExercise} disabled={exerciseIndex === exerciseStates.length - 1} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={exerciseIndex === exerciseStates.length - 1 ? colors.muted : colors.cyan} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.currentName}>{currentExercise.name}</Text>

        {/* Set Table */}
        <ScrollView style={styles.setsScroll} contentContainerStyle={styles.setsScrollContent}>
          <View style={styles.setTableHeader}>
            <Text style={[styles.th, { width: 36 }]}>SET</Text>
            <Text style={[styles.th, { flex: 1 }]}>WEIGHT ({unit})</Text>
            <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
            <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>DONE</Text>
          </View>

          {currentExercise.sets.map((set, setIdx) => (
            <View key={set.setNumber} style={[styles.setRowItem, set.completed && styles.setRowCompleted]}>
              <Text style={styles.setColNumber}>{set.setNumber}</Text>

              {/* Weight control with minus, value/input, plus */}
              <View style={styles.controlGroup}>
                <Pressable onPress={() => handleUpdateWeight(setIdx, -2.5)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>-</Text>
                </Pressable>
                <TextInput
                  style={styles.weightInput}
                  value={set.weight != null ? String(set.weight) : ''}
                  onChangeText={(t) => handleSetDirectWeight(setIdx, t)}
                  placeholder="—"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                <Pressable onPress={() => handleUpdateWeight(setIdx, 2.5)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>

              {/* Reps control with minus, value, plus */}
              <View style={styles.controlGroup}>
                <Pressable onPress={() => handleUpdateReps(setIdx, -1)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>-</Text>
                </Pressable>
                <Text style={styles.repValue}>{set.reps}</Text>
                <Pressable onPress={() => handleUpdateReps(setIdx, 1)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>

              {/* Checkbox button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Set ${set.setNumber} completed`}
                onPress={() => handleToggleSetComplete(setIdx)}
                style={[styles.checkBtn, set.completed && styles.checkBtnDone]}
              >
                <Ionicons
                  name={set.completed ? 'checkmark' : 'ellipse-outline'}
                  size={18}
                  color={set.completed ? colors.obsidian : colors.cyan}
                />
              </Pressable>

              {/* Remove set if >1 set */}
              {currentExercise.sets.length > 1 && !set.completed ? (
                <Pressable onPress={() => handleRemoveSet(setIdx)} style={styles.removeSetBtn}>
                  <Ionicons name="close" size={14} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ))}

          <Pressable onPress={handleAddSet} style={styles.addSetButton}>
            <Ionicons name="add" size={16} color={colors.cyan} />
            <Text style={styles.addSetText}>Add Set</Text>
          </Pressable>
        </ScrollView>
      </GlassCard>

      {/* Bottom Footer Actions */}
      <View style={styles.actionRow}>
        <OutlineButton
          label="Finish Workout"
          onPress={handleFinishPrompt}
        />
        {exerciseIndex < exerciseStates.length - 1 ? (
          <PrimaryButton label="Next Exercise" onPress={handleNextExercise} />
        ) : (
          <PrimaryButton label="Review & Save" onPress={openCompletionSummary} />
        )}
      </View>

      {/* WORKOUT COMPLETION SUMMARY MODAL */}
      <Modal visible={isCompleteModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.summaryModalCard}>
            <ScrollView contentContainerStyle={styles.summaryModalContent}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTrophy}>
                  <Ionicons name="trophy-outline" size={32} color={colors.cyan} />
                </View>
                <Text style={styles.summaryEyebrow}>WORKOUT COMPLETE</Text>
                <Text style={styles.summaryTitle}>{activePlan.title}</Text>
              </View>

              {/* Grid of 6 KPIs */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>DURATION</Text>
                  <Text style={styles.kpiValue}>
                    {finalRecord ? `${finalRecord.durationMin} min` : '—'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>EXERCISES</Text>
                  <Text style={styles.kpiValue}>{exerciseStates.length}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>SETS</Text>
                  <Text style={styles.kpiValue}>{totals.completedSetsCount}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TOTAL REPS</Text>
                  <Text style={styles.kpiValue}>{totals.totalRepsCount}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>VOLUME</Text>
                  <Text style={[styles.kpiValue, totals.totalVolume == null && styles.kpiMuted]}>
                    {totals.totalVolume != null ? `${totals.totalVolume.toLocaleString()} ${unit}` : 'Volume unavailable'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>CALORIES</Text>
                  <Text style={styles.kpiValue}>
                    {finalRecord ? `${finalRecord.calories} kcal` : '—'}
                  </Text>
                </View>
              </View>

              {/* Personal Notes */}
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Personal Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={personalNotes}
                  onChangeText={setPersonalNotes}
                  placeholder="How did this session feel? (e.g. Felt strong on bench press, good tempo)"
                  placeholderTextColor={colors.muted}
                  multiline
                />
              </View>

              {/* Saved confirmation feedback */}
              {isSavedSuccessfully ? (
                <View style={styles.savedBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.savedText}>Workout saved successfully.</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.summaryActions}>
                {!isSavedSuccessfully ? (
                  <PrimaryButton
                    label={isSavingRecord ? 'Saving...' : 'Save Workout'}
                    onPress={handleSaveWorkout}
                    disabled={isSavingRecord}
                  />
                ) : null}
                <OutlineButton
                  label="View History"
                  onPress={() => {
                    setIsCompleteModalVisible(false);
                    router.replace('/history');
                  }}
                />
                <OutlineButton
                  label="Back to Activity"
                  onPress={() => {
                    setIsCompleteModalVisible(false);
                    router.replace('/home');
                  }}
                />
              </View>
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  headerCopy: { flex: 1, marginHorizontal: spacing.sm },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  pauseButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },

  // Timer card
  timerCard: { gap: spacing.xs, paddingVertical: spacing.sm },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerItem: { alignItems: 'center', flex: 1 },
  timer: { color: colors.white, fontSize: 24, fontWeight: '700', fontFamily: 'monospace' },
  timerLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '700' },
  restTime: { color: colors.warning, fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  restLabel: { color: colors.warning, fontSize: typography.label, fontWeight: '700' },
  volumeStat: { color: colors.cyan, fontSize: 20, fontWeight: '700' },
  volumeLabel: { color: colors.silver, fontSize: typography.label, fontWeight: '700' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  progressText: { color: colors.silver, fontSize: typography.caption },
  unitToggle: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: radii.sm, overflow: 'hidden' },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  unitBtnActive: { backgroundColor: colors.cyan },
  unitText: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  unitTextActive: { color: colors.obsidian },

  progressBar: { height: 4, backgroundColor: colors.line, borderRadius: radii.pill, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: colors.cyan },

  // Exercise card
  currentCard: { flex: 1, gap: spacing.sm, paddingVertical: spacing.md },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navRow: { flexDirection: 'row', gap: spacing.xs },
  navBtn: { padding: 4 },
  currentName: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },

  // Set Table
  setsScroll: { flex: 1 },
  setsScrollContent: { gap: spacing.xs, paddingBottom: spacing.sm },
  setTableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  th: { color: colors.muted, fontSize: typography.label, fontWeight: '700' },
  setRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderRadius: radii.md, backgroundColor: 'rgba(255, 255, 255, 0.02)', paddingHorizontal: spacing.xs },
  setRowCompleted: { backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  setColNumber: { width: 36, color: colors.silver, fontSize: typography.body, fontWeight: '700' },

  controlGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stepBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: colors.cyan, fontSize: 16, fontWeight: '700', lineHeight: 18 },
  weightInput: { width: 44, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: radii.sm, textAlign: 'center', color: colors.white, fontSize: typography.body, fontWeight: '700' },
  repValue: { width: 32, textAlign: 'center', color: colors.white, fontSize: typography.body, fontWeight: '700' },

  checkBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  checkBtnDone: { backgroundColor: colors.cyan },
  removeSetBtn: { padding: 4 },

  addSetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, marginTop: spacing.xs },
  addSetText: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: spacing.sm },

  // Summary Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(3, 7, 8, 0.92)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  summaryModalCard: { width: '100%', maxWidth: 480, maxHeight: '90%', gap: spacing.md },
  summaryModalContent: { gap: spacing.md, paddingVertical: spacing.sm },
  summaryHeader: { alignItems: 'center', gap: 4 },
  summaryTrophy: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 229, 255, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  summaryEyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  summaryTitle: { color: colors.white, fontSize: typography.h1, fontWeight: '700', textAlign: 'center' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  kpiCard: { width: '31%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: radii.md, padding: spacing.sm, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.line },
  kpiLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '700' },
  kpiValue: { color: colors.white, fontSize: typography.title, fontWeight: '700', textAlign: 'center' },
  kpiMuted: { color: colors.muted, fontSize: typography.caption },

  notesBox: { gap: 4 },
  notesLabel: { color: colors.silver, fontSize: typography.caption, fontWeight: '600' },
  notesInput: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: spacing.sm, color: colors.white, minHeight: 64, textAlignVertical: 'top' },

  savedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: 'rgba(11, 218, 81, 0.12)', padding: spacing.sm, borderRadius: radii.md },
  savedText: { color: colors.success, fontSize: typography.caption, fontWeight: '700' },

  summaryActions: { gap: spacing.sm, marginTop: spacing.xs },
});
