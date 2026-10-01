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

async function saveLocalWorkout(userId: string, record: WorkoutRecord): Promise<void> {
  const raw = await AsyncStorage.getItem(localKey(userId));
  const existing = raw ? (JSON.parse(raw) as WorkoutRecord[]) : [];
  await AsyncStorage.setItem(localKey(userId), JSON.stringify([record, ...existing]));
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
<<<<<<< HEAD
        if (!error && data) {
          const records: WorkoutRecord[] = (data as WorkoutRow[]).map((row) => ({
=======
        if (error) throw new Error(error.message);
        if (data) {
          const remoteWorkouts = (data as WorkoutRow[]).map((row) => ({
>>>>>>> 5fb5ef8097362290a1b6c788ab3899c21ca119cd
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 5fb5ef8097362290a1b6c788ab3899c21ca119cd
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
<<<<<<< HEAD
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
=======
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
      if (error || !workoutRow) {
        await saveLocalWorkout(userId, record);
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
        if (exerciseError) {
          // The workout itself is already persisted remotely; keep the session rather than losing it.
          return;
        }
>>>>>>> 5fb5ef8097362290a1b6c788ab3899c21ca119cd
      }
    }
<<<<<<< HEAD
=======
    await saveLocalWorkout(userId, record);
>>>>>>> 5fb5ef8097362290a1b6c788ab3899c21ca119cd
  },
};
