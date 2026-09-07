export type FitnessGoal = 'Muscle Gain' | 'Fat Loss' | 'Strength' | 'Endurance' | 'General Fitness';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Gender = 'Male' | 'Female' | 'Other';
export type AppRole = 'member' | 'trainer' | 'gym_owner';

export interface MemberProfile {
  readonly fullName: string;
  readonly age: number;
  readonly gender: Gender;
  readonly fitnessGoal: FitnessGoal;
  readonly fitnessLevel: FitnessLevel;
  readonly heightCm: number;
  readonly weightKg: number;
}

export interface ResolvedMemberProfile extends MemberProfile {
  readonly role: AppRole;
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

export interface AuthResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly needsEmailConfirmation?: boolean;
  readonly user?: AuthUser;
}

export interface PlannedExercise {
  readonly name: string;
  readonly sets: number;
  readonly reps: number;
}

export type WorkoutStatus = 'Completed' | 'Partial';

export interface WorkoutRecord {
  readonly id: string;
  readonly date: string;
  readonly type: string;
  readonly durationMin: number;
  readonly intensity: string;
  readonly focus: string;
  readonly calories: number;
  readonly exercises: readonly PlannedExercise[];
  readonly status: WorkoutStatus;
}

export interface DailyActivity {
  readonly steps: number;
  readonly caloriesBurned: number;
  readonly activeMinutes: number;
}

export interface WeekDayActivity {
  readonly day: string;
  readonly steps: number;
}
