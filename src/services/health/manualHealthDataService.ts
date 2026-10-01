import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HealthMetricId, HealthSnapshot } from '@/types/health';

export interface ManualHealthEntry {
  readonly capturedAt: string;
  readonly heartRate: number;
  readonly hrv: number;
  readonly sleep: number;
  readonly sleepScore: number;
  readonly stress: number;
  readonly trainingLoad: number;
  readonly steps: number;
  readonly caloriesBurned: number;
  readonly activeMinutes: number;
}

const keyFor = (userId: string) => `aurasync_manual_health_${userId}`;

const toSnapshot = (entry: ManualHealthEntry, memberName: string, fitnessGoal: string): HealthSnapshot => ({
  capturedAt: entry.capturedAt,
  sourceId: 'manual',
  isSynthetic: false,
  member: { name: memberName, fitnessGoal },
  metrics: {
    heartRate: { id: 'heartRate', label: 'Heart Rate', value: entry.heartRate, unit: 'BPM', detail: 'Self-entered', status: 'Normal' },
    hrv: { id: 'hrv', label: 'HRV', value: entry.hrv, unit: 'ms', detail: 'Self-entered', status: 'Normal' },
    sleep: { id: 'sleep', label: 'Sleep', value: entry.sleep, unit: 'hrs', detail: 'Self-entered', status: 'Normal' },
    sleepScore: { id: 'sleepScore', label: 'Sleep Score', value: entry.sleepScore, unit: '/100', detail: 'Self-entered', status: 'Normal' },
    stress: { id: 'stress', label: 'Stress', value: entry.stress, unit: '/100', detail: 'Self-entered', status: 'Normal' },
    trainingLoad: { id: 'trainingLoad', label: 'Training Load', value: entry.trainingLoad, unit: '/100', detail: 'Self-entered', status: 'Normal' },
  },
  recoveryInputs: {
    hrv: entry.hrv,
    sleepScore: entry.sleepScore,
    stressScore: entry.stress,
    trainingLoad: entry.trainingLoad,
  },
});

export async function getManualHealthEntries(userId: string): Promise<readonly ManualHealthEntry[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ManualHealthEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveManualHealthEntry(userId: string, entry: ManualHealthEntry): Promise<void> {
  const current = await getManualHealthEntries(userId);
  const next = [entry, ...current].slice(0, 90);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
}

const DASHBOARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinDashboardWindow(capturedAt: string, now = Date.now()): boolean {
  const timestamp = new Date(capturedAt).getTime();
  return Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp < DASHBOARD_WINDOW_MS;
}

export async function getLatestManualSnapshot(
  userId: string,
  memberName: string,
  fitnessGoal: string,
): Promise<HealthSnapshot | null> {
  const entries = await getManualHealthEntries(userId);
  const currentEntry = entries.find((entry) => isWithinDashboardWindow(entry.capturedAt));
  return currentEntry ? toSnapshot(currentEntry, memberName, fitnessGoal) : null;
}

export function getMetricValue(entry: ManualHealthEntry, metric: HealthMetricId): number {
  return entry[metric];
}
