import { Platform } from 'react-native';
import type { PlannedExercise, WorkoutRecord } from '@/types/member';
import { EXERCISE_LIBRARY, type ExerciseCategory } from '@/domain/workout/exerciseLibrary';
import type { WorkoutPlan, WorkoutPlanInput } from '@/types/workout';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : 'http://localhost:3001');
const REQUEST_TIMEOUT_MS = 30_000;

<<<<<<< HEAD
const UPPER_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Barbell bench press', sets: 4, reps: 8 },
  { name: 'Wide-grip lat pulldown', sets: 4, reps: 10 },
  { name: 'Standing barbell overhead press', sets: 3, reps: 10 },
  { name: 'Seated cable row', sets: 3, reps: 10 },
  { name: 'Dumbbell lateral raise', sets: 3, reps: 12 },
];

const LOWER_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Back squat', sets: 4, reps: 8 },
  { name: 'Romanian deadlift', sets: 4, reps: 10 },
  { name: 'Leg press', sets: 3, reps: 12 },
  { name: 'Walking lunges', sets: 3, reps: 12 },
  { name: 'Standing calf raise', sets: 3, reps: 15 },
];

const RECOVERY_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Goblet squat', sets: 3, reps: 12 },
  { name: 'Incline dumbbell press', sets: 3, reps: 12 },
  { name: 'Seated cable row', sets: 3, reps: 12 },
  { name: 'Glute bridge', sets: 3, reps: 15 },
  { name: 'Plank', sets: 3, reps: 60 },
];
=======
const byCategory = (category: ExerciseCategory): PlannedExercise[] =>
  EXERCISE_LIBRARY.filter((exercise) => exercise.category === category)
    .slice(0, 5)
    .map((exercise) => ({ name: exercise.name, sets: exercise.defaultSets, reps: exercise.defaultReps }));

const uniqueCategoriesFromWorkouts = (workouts: readonly WorkoutRecord[]): ExerciseCategory[] => {
  const categories: ExerciseCategory[] = [];
  for (const workout of workouts.slice(0, 3)) {
    for (const planned of workout.exercises) {
      const match = EXERCISE_LIBRARY.find((exercise) => exercise.name.toLowerCase() === planned.name.toLowerCase());
      if (match && !categories.includes(match.category)) categories.push(match.category);
    }
  }
  return categories;
};

const chooseFallbackCategory = (input: WorkoutPlanInput): ExerciseCategory => {
  const recentCategories = uniqueCategoriesFromWorkouts(input.recentWorkouts);
  const goal = input.fitnessGoal.toLowerCase();

  if (input.recoveryScore < 50) return 'Conditioning / Full Body';
  if (goal.includes('strength')) {
    return recentCategories.includes('Quads') ? 'Back' : 'Quads';
  }
  if (goal.includes('fat') || goal.includes('endurance')) {
    return recentCategories.includes('Conditioning / Full Body') ? 'Quads' : 'Conditioning / Full Body';
  }

  const rotation: ExerciseCategory[] = ['Chest', 'Back', 'Quads', 'Shoulders', 'Hamstrings / Glutes', 'Triceps', 'Biceps'];
  return rotation.find((category) => !recentCategories.includes(category)) ?? 'Chest';
};

const fallbackExercises = (category: ExerciseCategory, recoveryScore: number): PlannedExercise[] => {
  if (category === 'Conditioning / Full Body') {
    return byCategory(category).map((exercise) => ({ ...exercise, sets: recoveryScore < 65 ? 2 : 3 }));
  }
  return byCategory(category).map((exercise) => ({
    ...exercise,
    sets: recoveryScore < 65 ? Math.max(2, exercise.sets - 1) : exercise.sets,
    reps: recoveryScore < 65 ? Math.min(12, exercise.reps + 2) : exercise.reps,
  }));
};
>>>>>>> 5fb5ef8097362290a1b6c788ab3899c21ca119cd

export function buildFallbackPlan(input: WorkoutPlanInput): WorkoutPlan {
  const category = chooseFallbackCategory(input);
  const lowRecovery = input.recoveryScore < 50;
  const moderateRecovery = input.recoveryScore < 75;
  const intensity = lowRecovery ? 'Low' : moderateRecovery ? 'Moderate' : 'High';
  const durationMin = lowRecovery ? 35 : moderateRecovery ? 45 : 52;
  const exercises = fallbackExercises(category, input.recoveryScore);
  const focus = category === 'Conditioning / Full Body' ? 'Full Body • Conditioning' : category;

  return {
    title: lowRecovery ? 'Recovery-Aware Full Body Session' : `${category} Session`,
    intensity,
    durationMin,
    focus,
    reason: `Recovery is ${input.recoveryScore}/100 (${input.readiness}). The plan also considers your ${input.fitnessGoal.toLowerCase()} goal and recent training rotation.`,
    recoveryTip: lowRecovery
      ? 'Keep effort comfortable and prioritise recovery today.'
      : 'Leave controlled reps in reserve and recover before your next hard session.',
    exercises,
    isFallback: true,
  };
}

function serializeRecentWorkouts(workouts: readonly WorkoutRecord[]): string {
  if (!workouts.length) return 'No recent workouts recorded.';
  return workouts.slice(0, 7).map((workout, index) => {
    const exercises = workout.exercises.map((exercise) => `${exercise.name} (${exercise.sets}x${exercise.reps})`).join(', ');
    return `#${index + 1} ${workout.date} | ${workout.type} | ${workout.focus} | ${workout.intensity} | ${workout.durationMin} min | ${workout.status} | Exercises: ${exercises || 'none'}`;
  }).join('\n');
}

function buildHealthContext(input: WorkoutPlanInput): string {
  return `Recovery Score: ${input.recoveryScore}/100 (${input.readiness})
HRV: ${input.hrv} ms
Sleep Score: ${input.sleepScore}/100
Stress: ${input.stress}/100
Training Load: ${input.trainingLoad}/100
Data Source: ${input.isDemoMode ? 'demo/synthetic' : 'connected'}`;
}

interface WorkoutPlanResponse {
  readonly success: boolean;
  readonly plan?: {
    title: string;
    intensity: string;
    durationMin: number;
    focus: string;
    reason: string;
    recoveryTip: string;
    exercises: { name: string; sets: number; reps: number }[];
  };
  readonly error?: string;
  readonly fallback: boolean;
}

export async function requestWorkoutPlan(input: WorkoutPlanInput): Promise<WorkoutPlan> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/workout-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthContext: buildHealthContext(input),
        profileContext: `Fitness goal: ${input.fitnessGoal} | Fitness level: ${input.fitnessLevel}`,
        recentWorkouts: serializeRecentWorkouts(input.recentWorkouts),
        isDemoMode: input.isDemoMode,
      }),
      signal: controller.signal,
    });

    const data = (await response.json()) as WorkoutPlanResponse;
    if (response.ok && data.success && data.plan && data.plan.exercises.length > 0) {
      return { ...data.plan, isFallback: false };
    }
  } catch {
    // Use the deterministic plan when the AI service is unavailable.
  } finally {
    clearTimeout(timeout);
  }

  return buildFallbackPlan(input);
}
