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
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      if (!data) return [];
      return (data as WorkoutRow[]).map((row) => ({
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
    }
    const raw = await AsyncStorage.getItem(localKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutRecord[];
  },

  async saveWorkout(userId: string, record: WorkoutRecord): Promise<void> {
    if (supabase) {
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
      if (error) throw new Error(error.message);
      const rows = record.exercises.map((exercise, index) => ({
        workout_id: workoutRow.id,
        position: index,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
      }));
      if (rows.length > 0) {
        const { error: exerciseError } = await supabase.from('workout_exercises').insert(rows);
        if (exerciseError) throw new Error(exerciseError.message);
      }
      return;
    }
    const raw = await AsyncStorage.getItem(localKey(userId));
    const existing = raw ? (JSON.parse(raw) as WorkoutRecord[]) : [];
    await AsyncStorage.setItem(localKey(userId), JSON.stringify([record, ...existing]));
  },
};
