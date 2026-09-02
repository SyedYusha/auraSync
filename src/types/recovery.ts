export interface RecoveryInputs {
  readonly hrv: number;
  readonly sleepScore: number;
  readonly stressScore: number;
  readonly trainingLoad: number;
}

export type RecoveryReadiness = 'Excellent' | 'Good' | 'Moderate' | 'Poor';
export type FatigueLevel = 'Low' | 'Moderate' | 'High';

export interface RecoveryFactor {
  readonly key: keyof RecoveryInputs;
  readonly label: string;
  readonly rawValue: number;
  readonly subScore: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface RecoveryResult {
  readonly score: number;
  readonly readiness: RecoveryReadiness;
  readonly fatigueLevel: FatigueLevel;
  readonly factors: readonly RecoveryFactor[];
  readonly warnings: readonly string[];
}
