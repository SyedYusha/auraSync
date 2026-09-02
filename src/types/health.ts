import type { RecoveryInputs } from './recovery';

export type HealthDataSourceId =
  | 'demo'
  | 'health-connect'
  | 'apple-health'
  | 'garmin'
  | 'fitbit'
  | 'aurasync-wearable';

export type HealthMetricId =
  | 'heartRate'
  | 'hrv'
  | 'sleep'
  | 'sleepScore'
  | 'stress'
  | 'trainingLoad';

export type MetricStatus = 'Optimal' | 'Normal' | 'Low' | 'Moderate' | 'High';

export interface HealthMetric {
  readonly id: HealthMetricId;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly detail: string;
  readonly status: MetricStatus;
}

export interface MemberProfile {
  readonly name: string;
  readonly fitnessGoal: string;
}

export interface HealthSnapshot {
  readonly capturedAt: string;
  readonly sourceId: HealthDataSourceId;
  readonly isSynthetic: true;
  readonly member: MemberProfile;
  readonly metrics: Readonly<Record<HealthMetricId, HealthMetric>>;
  readonly recoveryInputs: RecoveryInputs;
}
