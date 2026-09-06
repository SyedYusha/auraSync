import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutRecord } from '@/types/member';

import { supabase } from '../auth/supabaseClient';

const localKey = (userId: string) => `aurasync_workouts_${userId}`;

const seedWorkouts: readonly WorkoutRecord[] = [
  {
    id: 'seed-2026-08-31',
    date: '2026-08-31T18:02:00.000Z',
    type: 'Upper Body Strength',
    durationMin: 52,
    intensity: 'High',
    focus: 'Chest, Back, Shoulders',
    calories: 612,
    status: 'Completed',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8 },
      { name: 'Lat Pulldown', sets: 4, reps: 10 },
      { name: 'Shoulder Press', sets: 3, reps: 10 },
      { name: 'Seated Cable Row', sets: 3, reps: 10 },
      { name: 'Lateral Raises', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'seed-2026-08-29',
    date: '2026-08-29T17:10:00.000Z',
    type: 'Lower Body',
    durationMin: 48,
    intensity: 'Moderate',
    focus: 'Quads, Glutes, Hamstrings',
    calories: 548,
    status: 'Completed',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 8 },
      { name: 'Romanian Deadlift', sets: 4, reps: 10 },
      { name: 'Leg Press', sets: 3, reps: 12 },
      { name: 'Walking Lunges', sets: 3, reps: 12 },
      { name: 'Standing Calf Raise', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'seed-2026-08-27',
    date: '2026-08-27T18:25:00.000Z',
    type: 'Full Body',
    durationMin: 55,
    intensity: 'High',
    focus: 'Full Body Conditioning',
    calories: 640,
    status: 'Completed',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 6 },
      { name: 'Incline Dumbbell Press', sets: 4, reps: 10 },
      { name: 'Goblet Squat', sets: 3, reps: 12 },
      { name: 'Bent-Over Row', sets: 3, reps: 10 },
      { name: 'Hanging Knee Raise', sets: 3, reps: 15 },
    ],
  },
];

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
    if (!raw) {
      await AsyncStorage.setItem(localKey(userId), JSON.stringify(seedWorkouts));
      return seedWorkouts;
    }
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
