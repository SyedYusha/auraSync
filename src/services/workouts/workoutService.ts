import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ExerciseSet, WeightUnit, WorkoutRecord } from '@/types/member';

import { supabase } from '../auth/supabaseClient';

const localKey = (userId: string) => `aurasync_workouts_${userId}`;

interface WorkoutExerciseRow {
  id?: string;
  workout_id?: string;
  position: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number | null;
  unit?: string | null;
  completed_sets?: number | null;
  set_details?: string | readonly ExerciseSet[] | null;
}

interface WorkoutRow {
  id: string;
  user_id: string;
  date: string;
  type: string;
  duration_min: number;
  intensity: string;
  focus: string;
  calories: number;
  status: string;
  total_volume?: number | null;
  notes?: string | null;
  workout_exercises?: WorkoutExerciseRow[];
}

async function saveLocalWorkout(userId: string, record: WorkoutRecord): Promise<void> {
  const raw = await AsyncStorage.getItem(localKey(userId));
  const existing = raw ? (JSON.parse(raw) as WorkoutRecord[]) : [];
  // Idempotent: avoid duplicates if already saved with the same ID
  const filtered = existing.filter((w) => w.id !== record.id);
  await AsyncStorage.setItem(localKey(userId), JSON.stringify([record, ...filtered]));
}

export const workoutService = {
  async getWorkouts(userId: string): Promise<readonly WorkoutRecord[]> {
    const readLocal = async (): Promise<WorkoutRecord[]> => {
      const raw = await AsyncStorage.getItem(localKey(userId));
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as WorkoutRecord[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*, workout_exercises(*)')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) throw new Error(error.message);
        if (data) {
          const remoteWorkouts: WorkoutRecord[] = (data as WorkoutRow[]).map((row) => ({
            id: row.id,
            date: row.date,
            type: row.type,
            durationMin: row.duration_min,
            intensity: row.intensity,
            focus: row.focus,
            calories: row.calories,
            status: row.status as WorkoutRecord['status'],
            totalVolume: row.total_volume != null ? Number(row.total_volume) : null,
            notes: row.notes ?? null,
            exercises: [...(row.workout_exercises ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((exercise) => {
                let parsedSetDetails: readonly ExerciseSet[] | undefined = undefined;
                if (exercise.set_details) {
                  try {
                    parsedSetDetails = typeof exercise.set_details === 'string'
                      ? (JSON.parse(exercise.set_details) as readonly ExerciseSet[])
                      : (exercise.set_details as readonly ExerciseSet[]);
                  } catch {}
                }

                return {
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight: exercise.weight != null ? Number(exercise.weight) : null,
                  unit: (exercise.unit as WeightUnit) ?? 'kg',
                  completedSets: exercise.completed_sets ?? exercise.sets,
                  setDetails: parsedSetDetails,
                };
              }),
          }));

          const remoteIds = new Set(remoteWorkouts.map((workout) => workout.id));
          const localFallbacks = (await readLocal()).filter((workout) => !remoteIds.has(workout.id));
          return [...remoteWorkouts, ...localFallbacks].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        }
      } catch {
        // Fall through to the local session store for offline/error resilience.
      }
    }

    return readLocal();
  },

  async saveWorkout(userId: string, record: WorkoutRecord): Promise<{ ok: boolean; savedToDb: boolean }> {
    // 1. Always save to local cache first for instant feedback & offline resilience
    await saveLocalWorkout(userId, record);

    let savedToDb = false;

    // 2. Persist to Supabase if connected
    if (supabase) {
      try {
        const { data: workoutRow, error } = await supabase
          .from('workouts')
          .upsert(
            {
              id: record.id,
              user_id: userId,
              date: record.date,
              type: record.type,
              duration_min: record.durationMin,
              intensity: record.intensity,
              focus: record.focus,
              calories: record.calories,
              status: record.status,
              total_volume: record.totalVolume ?? null,
              notes: record.notes ?? null,
            },
            { onConflict: 'id' },
          )
          .select()
          .single();

        if (error || !workoutRow) {
          console.warn('Supabase workout save failed, preserved offline:', error?.message);
        } else {
          savedToDb = true;

          // Delete existing exercise rows if re-saving (idempotent)
          await supabase.from('workout_exercises').delete().eq('workout_id', record.id);

          const exerciseRows = record.exercises.map((exercise, index) => ({
            id: `we-${record.id}-${index}`,
            workout_id: record.id,
            position: index,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight ?? null,
            unit: exercise.unit ?? 'kg',
            completed_sets: exercise.completedSets ?? exercise.sets,
            set_details: exercise.setDetails ? JSON.stringify(exercise.setDetails) : null,
          }));

          if (exerciseRows.length > 0) {
            const { error: exerciseError } = await supabase.from('workout_exercises').insert(exerciseRows);
            if (exerciseError) {
              console.warn('Supabase workout_exercises save failed:', exerciseError.message);
            }
          }
        }
      } catch (error) {
        console.warn('Network error saving workout to Supabase, preserved in local storage:', error);
      }
    }

    return { ok: true, savedToDb };
  },
};
