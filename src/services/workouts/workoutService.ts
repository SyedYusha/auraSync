import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutRecord } from '@/types/member';

import { supabase } from '../auth/supabaseClient';

const localKey = (userId: string) => `aurasync_workouts_${userId}`;

interface WorkoutRow {
  id: string;
  date: string;
  type: string;
  duration_min: number;
  intensity: string;
  focus: string;
  calories: number;
  status: string;
  workout_exercises?: { position: number; name: string; sets: number; reps: number }[];
}

export const workoutService = {
  async getWorkouts(userId: string): Promise<readonly WorkoutRecord[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*, workout_exercises(*)')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (!error && data) {
          const records: WorkoutRecord[] = (data as WorkoutRow[]).map((row) => ({
            id: row.id,
            date: row.date,
            type: row.type,
            durationMin: row.duration_min,
            intensity: row.intensity,
            focus: row.focus,
            calories: row.calories,
            status: row.status as WorkoutRecord['status'],
            exercises: [...(row.workout_exercises ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((exercise) => ({ name: exercise.name, sets: exercise.sets, reps: exercise.reps })),
          }));
          await AsyncStorage.setItem(localKey(userId), JSON.stringify(records));
          return records;
        }
      } catch {
        // Fall back to AsyncStorage cache below
      }
    }
    const raw = await AsyncStorage.getItem(localKey(userId));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as WorkoutRecord[];
    } catch {
      return [];
    }
  },

  async saveWorkout(userId: string, record: WorkoutRecord): Promise<void> {
    // Always persist to local cache first so it's guaranteed offline
    try {
      const raw = await AsyncStorage.getItem(localKey(userId));
      const existing = raw ? (JSON.parse(raw) as WorkoutRecord[]) : [];
      const updated = [record, ...existing.filter((w) => w.id !== record.id)];
      await AsyncStorage.setItem(localKey(userId), JSON.stringify(updated));
    } catch {
      // Best-effort local cache
    }

    if (supabase) {
      try {
        const { data: workoutRow, error } = await supabase
          .from('workouts')
          .insert({
            user_id: userId,
            date: record.date,
            type: record.type,
            duration_min: record.durationMin,
            intensity: record.intensity,
            focus: record.focus,
            calories: record.calories,
            status: record.status,
          })
          .select()
          .single();
        if (error) {
          console.warn('Supabase workout save failed, preserved offline:', error.message);
          return;
        }
        const rows = record.exercises.map((exercise, index) => ({
          workout_id: workoutRow.id,
          position: index,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
        }));
        if (rows.length > 0) {
          const { error: exerciseError } = await supabase.from('workout_exercises').insert(rows);
          if (exerciseError) console.warn('Supabase workout_exercises save failed:', exerciseError.message);
        }
      } catch (error) {
        console.warn('Network error saving workout to Supabase, preserved in local storage:', error);
      }
    }
  },
};
