import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateRecoveryScore, RECOVERY_WEIGHTS } from './calculateRecoveryScore.ts';

test('the AuraSync demo inputs produce 92 Excellent', () => {
  const result = calculateRecoveryScore({
    hrv: 84,
    sleepScore: 94,
    stressScore: 22,
    trainingLoad: 65,
  });

  assert.equal(result.score, 92);
  assert.equal(result.readiness, 'Excellent');
  assert.equal(result.fatigueLevel, 'Low');
  assert.equal(result.warnings.length, 0);
});

test('recovery readiness follows the specified boundaries', () => {
  assert.equal(calculateRecoveryScore({ hrv: 80, sleepScore: 100, stressScore: 0, trainingLoad: 55 }).readiness, 'Excellent');
  assert.equal(calculateRecoveryScore({ hrv: 70, sleepScore: 80, stressScore: 20, trainingLoad: 55 }).readiness, 'Good');
  assert.equal(calculateRecoveryScore({ hrv: 45, sleepScore: 55, stressScore: 45, trainingLoad: 55 }).readiness, 'Moderate');
  assert.equal(calculateRecoveryScore({ hrv: 0, sleepScore: 0, stressScore: 100, trainingLoad: 100 }).readiness, 'Poor');
});

test('calculation is repeatable and safely clamps malformed inputs', () => {
  const input = { hrv: Number.NaN, sleepScore: -4, stressScore: 140, trainingLoad: Number.POSITIVE_INFINITY };
  const first = calculateRecoveryScore(input);
  const second = calculateRecoveryScore(input);

  assert.deepEqual(first, second);
  assert.ok(first.score >= 0 && first.score <= 100);
  assert.ok(first.warnings.length > 0);
  assert.equal(
    RECOVERY_WEIGHTS.hrv + RECOVERY_WEIGHTS.sleepScore + RECOVERY_WEIGHTS.stressScore + RECOVERY_WEIGHTS.trainingLoad,
    1,
  );
});
