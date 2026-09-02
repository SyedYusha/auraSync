import type { HealthSnapshot } from '@/types/health';

import type { HealthDataSource } from './HealthDataSource';

const demoSnapshot: HealthSnapshot = {
  capturedAt: '2026-09-02T08:00:00.000Z',
  sourceId: 'demo',
  isSynthetic: true,
  member: {
    name: 'Yusha',
    fitnessGoal: 'Build strength with consistent recovery',
  },
  metrics: {
    heartRate: { id: 'heartRate', label: 'Heart Rate', value: 72, unit: 'BPM', detail: 'Resting', status: 'Normal' },
    hrv: { id: 'hrv', label: 'HRV', value: 84, unit: 'ms', detail: 'Baseline', status: 'Optimal' },
    sleep: { id: 'sleep', label: 'Sleep', value: 8.2, unit: 'hrs', detail: '8h 12m', status: 'Optimal' },
    sleepScore: { id: 'sleepScore', label: 'Sleep Score', value: 94, unit: '/100', detail: 'Restorative', status: 'Optimal' },
    stress: { id: 'stress', label: 'Stress', value: 22, unit: '/100', detail: 'Low', status: 'Low' },
    trainingLoad: { id: 'trainingLoad', label: 'Training Load', value: 65, unit: '/100', detail: 'Balanced', status: 'Moderate' },
  },
  recoveryInputs: {
    hrv: 84,
    sleepScore: 94,
    stressScore: 22,
    trainingLoad: 65,
  },
};

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class DemoHealthDataSource implements HealthDataSource {
  readonly id = 'demo' as const;
  readonly displayName = 'Demo / Synthetic Data';
  readonly isImplemented = true;

  async getLatestSnapshot(): Promise<HealthSnapshot> {
    await wait(450);
    return demoSnapshot;
  }
}

export const demoHealthDataSource = new DemoHealthDataSource();
