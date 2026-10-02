export type FitnessGoal = 'Muscle Gain' | 'Fat Loss' | 'Strength' | 'Endurance' | 'General Fitness';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Gender = 'Male' | 'Female' | 'Other';
export type AppRole = 'member' | 'trainer' | 'gym_owner';

export type MemberGymStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'payment_pending'
  | 'active'
  | 'expired'
  | 'rejected'
  | 'cancelled';

export interface MemberProfile {
  readonly fullName: string;
  readonly phone?: string;
  readonly age: number;
  readonly gender: Gender;
  readonly fitnessGoal: FitnessGoal;
  readonly fitnessLevel: FitnessLevel;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly connectedGymId?: string | null;
  readonly gymMembershipStatus?: MemberGymStatus;
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

export type WeightUnit = 'kg' | 'lbs';

export interface ExerciseSet {
  readonly setNumber: number;
  readonly reps: number;
  readonly weight: number | null;
  readonly unit: WeightUnit;
  readonly completed: boolean;
  readonly skipped?: boolean;
}

export interface PlannedExercise {
  readonly name: string;
  readonly sets: number;
  readonly reps: number;
  readonly weight?: number | null;
  readonly unit?: WeightUnit;
  readonly completedSets?: number;
  readonly setDetails?: readonly ExerciseSet[];
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
  readonly totalVolume?: number | null;
  readonly notes?: string | null;
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
