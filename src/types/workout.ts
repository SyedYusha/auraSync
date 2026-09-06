import type { PlannedExercise } from './member';

export interface WorkoutPlan {
  readonly title: string;
  readonly intensity: string;
  readonly durationMin: number;
  readonly focus: string;
  readonly reason: string;
  readonly recoveryTip: string;
  readonly exercises: readonly PlannedExercise[];
  readonly isFallback: boolean;
}

export interface WorkoutPlanInput {
  readonly recoveryScore: number;
  readonly readiness: string;
  readonly hrv: number;
  readonly sleepScore: number;
  readonly stress: number;
  readonly trainingLoad: number;
  readonly fitnessGoal: string;
  readonly fitnessLevel: string;
  readonly lastWorkoutType: string | null;
  readonly isDemoMode: boolean;
}
