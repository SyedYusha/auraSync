import type { PlannedExercise } from '@/types/member';
import type { WorkoutPlan, WorkoutPlanInput } from '@/types/workout';

// Web falls back to localhost; for physical devices set EXPO_PUBLIC_API_URL
// to your PC's LAN IP (e.g. http://192.168.1.5:3001) in .env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const UPPER_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Bench Press', sets: 4, reps: 8 },
  { name: 'Lat Pulldown', sets: 4, reps: 10 },
  { name: 'Shoulder Press', sets: 3, reps: 10 },
  { name: 'Seated Cable Row', sets: 3, reps: 10 },
  { name: 'Lateral Raises', sets: 3, reps: 12 },
];

const LOWER_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Back Squat', sets: 4, reps: 8 },
  { name: 'Romanian Deadlift', sets: 4, reps: 10 },
  { name: 'Leg Press', sets: 3, reps: 12 },
  { name: 'Walking Lunges', sets: 3, reps: 12 },
  { name: 'Standing Calf Raise', sets: 3, reps: 15 },
];

const RECOVERY_EXERCISES: readonly PlannedExercise[] = [
  { name: 'Goblet Squat', sets: 3, reps: 12 },
  { name: 'Incline Dumbbell Press', sets: 3, reps: 12 },
  { name: 'Seated Cable Row', sets: 3, reps: 12 },
  { name: 'Glute Bridge', sets: 3, reps: 15 },
  { name: 'Dead Bug', sets: 3, reps: 12 },
];

/**
 * Deterministic demo plan used whenever the AI server is unreachable or errors.
 * Not a medical recommendation.
 */
export function buildFallbackPlan(input: WorkoutPlanInput): WorkoutPlan {
  if (input.recoveryScore < 50) {
    return {
      title: 'Full Body Recovery Session',
      intensity: 'Low',
      durationMin: 35,
      focus: 'Full Body • Mobility',
      reason: `Recovery is ${input.recoveryScore}/100 (${input.readiness}) with stress at ${input.stress}/100, so a lighter session protects your progress.`,
      recoveryTip: 'Prioritise sleep tonight and keep today below maximum effort.',
      exercises: RECOVERY_EXERCISES,
      isFallback: true,
    };
  }

  if (input.recoveryScore < 75) {
    return {
      title: 'Lower Body Strength',
      intensity: 'Moderate',
      durationMin: 48,
      focus: 'Quads • Glutes • Hamstrings',
      reason: `Recovery is ${input.recoveryScore}/100 (${input.readiness}) — enough for productive training, but not a max-effort session.`,
      recoveryTip: 'Keep 2 reps in reserve on every set and hydrate well.',
      exercises: LOWER_EXERCISES,
      isFallback: true,
    };
  }

  return {
    title: 'Upper Body Strength',
    intensity: 'High',
    durationMin: 52,
    focus: 'Chest • Back • Shoulders',
    reason: `Recovery is ${input.recoveryScore}/100 (${input.readiness}) with HRV at ${input.hrv} ms and a sleep score of ${input.sleepScore} — your body is ready for a strong session.`,
    recoveryTip: 'Fuel with protein within an hour of finishing.',
    exercises: UPPER_EXERCISES,
    isFallback: true,
  };
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/workout-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthContext: buildHealthContext(input),
        profileContext: `Fitness goal: ${input.fitnessGoal} | Fitness level: ${input.fitnessLevel}`,
        recentWorkouts: input.lastWorkoutType ? `Last session: ${input.lastWorkoutType}` : '',
        isDemoMode: input.isDemoMode,
      }),
    });

    const data = (await response.json()) as WorkoutPlanResponse;
    if (data.success && data.plan && data.plan.exercises.length > 0) {
      return {
        title: data.plan.title,
        intensity: data.plan.intensity,
        durationMin: data.plan.durationMin,
        focus: data.plan.focus,
        reason: data.plan.reason,
        recoveryTip: data.plan.recoveryTip,
        exercises: data.plan.exercises,
        isFallback: false,
      };
    }
  } catch {
    // Fall through to the deterministic demo plan.
  }

  return buildFallbackPlan(input);
}
