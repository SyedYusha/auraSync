import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExerciseSet } from '../../types/member';

function calculateWorkoutVolume(sets: readonly ExerciseSet[]): number | null {
  const completedSets = sets.filter((s) => s.completed && s.weight != null && s.weight > 0 && s.reps > 0);
  if (completedSets.length === 0) return null;
  return completedSets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
}

test('workout volume calculates correctly across multiple sets', () => {
  const sets: readonly ExerciseSet[] = [
    { setNumber: 1, reps: 10, weight: 40, unit: 'kg', completed: true },
    { setNumber: 2, reps: 10, weight: 45, unit: 'kg', completed: true },
    { setNumber: 3, reps: 8, weight: 50, unit: 'kg', completed: true },
  ];

  // 40 * 10 + 45 * 10 + 50 * 8 = 400 + 450 + 400 = 1250 kg
  const volume = calculateWorkoutVolume(sets);
  assert.equal(volume, 1250);
});

test('workout volume ignores uncompleted sets', () => {
  const sets: readonly ExerciseSet[] = [
    { setNumber: 1, reps: 10, weight: 50, unit: 'kg', completed: true },
    { setNumber: 2, reps: 10, weight: 50, unit: 'kg', completed: false },
  ];

  const volume = calculateWorkoutVolume(sets);
  assert.equal(volume, 500);
});

test('workout volume returns null when no weighted sets exist (does not fabricate volume)', () => {
  const sets: readonly ExerciseSet[] = [
    { setNumber: 1, reps: 15, weight: null, unit: 'kg', completed: true },
    { setNumber: 2, reps: 15, weight: 0, unit: 'kg', completed: true },
  ];

  const volume = calculateWorkoutVolume(sets);
  assert.equal(volume, null);
});
