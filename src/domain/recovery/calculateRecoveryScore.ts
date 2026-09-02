import type {
  FatigueLevel,
  RecoveryFactor,
  RecoveryInputs,
  RecoveryReadiness,
  RecoveryResult,
} from '../../types/recovery';

export const RECOVERY_WEIGHTS = {
  hrv: 0.3,
  sleepScore: 0.3,
  stressScore: 0.2,
  trainingLoad: 0.2,
} as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

function sanitise(value: number, label: string, maximum: number, warnings: string[]) {
  if (!Number.isFinite(value)) {
    warnings.push(`${label} was not a finite number and was treated as 0.`);
    return 0;
  }

  const safeValue = clamp(value, 0, maximum);
  if (safeValue !== value) {
    warnings.push(`${label} was clamped to the supported prototype range.`);
  }

  return safeValue;
}

function classify(score: number): RecoveryReadiness {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Poor';
}

function fatigueFor(score: number): FatigueLevel {
  if (score >= 75) return 'Low';
  if (score >= 50) return 'Moderate';
  return 'High';
}

/**
 * Prototype fitness-readiness calculation only. It is deterministic and is not a medical measurement.
 */
export function calculateRecoveryScore(inputs: RecoveryInputs): RecoveryResult {
  const warnings: string[] = [];
  const hrv = sanitise(inputs.hrv, 'HRV', 200, warnings);
  const sleepScore = sanitise(inputs.sleepScore, 'Sleep score', 100, warnings);
  const stressScore = sanitise(inputs.stressScore, 'Stress score', 100, warnings);
  const trainingLoad = sanitise(inputs.trainingLoad, 'Training load', 100, warnings);

  const hrvScore = clamp(((hrv - 20) / 60) * 100, 0, 100);
  const invertedStressScore = 100 - stressScore;
  const trainingLoadScore = clamp(100 - Math.abs(trainingLoad - 55), 0, 100);

  const factors: readonly RecoveryFactor[] = [
    {
      key: 'hrv',
      label: 'HRV balance',
      rawValue: hrv,
      subScore: hrvScore,
      weight: RECOVERY_WEIGHTS.hrv,
      contribution: hrvScore * RECOVERY_WEIGHTS.hrv,
    },
    {
      key: 'sleepScore',
      label: 'Sleep quality',
      rawValue: sleepScore,
      subScore: sleepScore,
      weight: RECOVERY_WEIGHTS.sleepScore,
      contribution: sleepScore * RECOVERY_WEIGHTS.sleepScore,
    },
    {
      key: 'stressScore',
      label: 'Stress balance',
      rawValue: stressScore,
      subScore: invertedStressScore,
      weight: RECOVERY_WEIGHTS.stressScore,
      contribution: invertedStressScore * RECOVERY_WEIGHTS.stressScore,
    },
    {
      key: 'trainingLoad',
      label: 'Training load',
      rawValue: trainingLoad,
      subScore: trainingLoadScore,
      weight: RECOVERY_WEIGHTS.trainingLoad,
      contribution: trainingLoadScore * RECOVERY_WEIGHTS.trainingLoad,
    },
  ];

  const score = Math.round(factors.reduce((total, factor) => total + factor.contribution, 0));

  return {
    score,
    readiness: classify(score),
    fatigueLevel: fatigueFor(score),
    factors,
    warnings,
  };
}
