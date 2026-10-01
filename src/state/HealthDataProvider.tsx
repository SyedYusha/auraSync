import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { demoHealthDataSource } from '@/services/health/DemoHealthDataSource';
import { getLatestManualSnapshot, getManualHealthEntries } from '@/services/health/manualHealthDataService';
import { useAuth } from '@/state/AuthProvider';
import type { HealthMetricId, HealthSnapshot } from '@/types/health';

export type HealthDataStatus = 'loading' | 'ready' | 'error';

interface HealthDataContextValue {
  readonly status: HealthDataStatus;
  readonly snapshot: HealthSnapshot | null;
  readonly error: string | null;
  readonly isDemoMode: boolean;
  readonly activityHistory: Awaited<ReturnType<typeof getManualHealthEntries>>;
  refresh(): Promise<void>;
}

const HealthDataContext = createContext<HealthDataContextValue | null>(null);
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const DEMO_MEMBER_ID = 'local-demo-member';

const EMPTY_METRICS: Record<HealthMetricId, { id: HealthMetricId; label: string; value: number; unit: string; detail: string; status: 'Low' }> = {
  heartRate: { id: 'heartRate', label: 'Heart Rate', value: 0, unit: 'bpm', detail: 'Waiting for health data', status: 'Low' },
  hrv: { id: 'hrv', label: 'HRV', value: 0, unit: 'ms', detail: 'Not available yet', status: 'Low' },
  sleep: { id: 'sleep', label: 'Sleep', value: 0, unit: 'h', detail: 'No sleep data synced', status: 'Low' },
  sleepScore: { id: 'sleepScore', label: 'Sleep Score', value: 0, unit: '/100', detail: 'No sleep data synced', status: 'Low' },
  stress: { id: 'stress', label: 'Stress', value: 0, unit: '/100', detail: 'Waiting for health data', status: 'Low' },
  trainingLoad: { id: 'trainingLoad', label: 'Training Load', value: 0, unit: '/100', detail: 'Complete your first activity', status: 'Low' },
};

const emptySnapshot = (): HealthSnapshot => ({
  capturedAt: new Date().toISOString(),
  sourceId: 'none',
  isSynthetic: false,
  member: { name: 'Member', fitnessGoal: 'General Fitness' },
  metrics: EMPTY_METRICS,
  recoveryInputs: { sleep: 0, hrv: 0, stress: 0, trainingLoad: 0 },
});

export function HealthDataProvider({ children }: PropsWithChildren) {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<HealthDataStatus>('loading');
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<Awaited<ReturnType<typeof getManualHealthEntries>>>([]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const isDemoMember = user?.id === DEMO_MEMBER_ID;
      if (DEMO_MODE || isDemoMember) {
        const nextSnapshot = await demoHealthDataSource.getLatestSnapshot();
        setSnapshot(nextSnapshot);
        setActivityHistory([]);
      } else if (user) {
        const manualSnapshot = await getLatestManualSnapshot(user.id, profile?.fullName ?? 'Member', profile?.fitnessGoal ?? 'General Fitness');
        setSnapshot(manualSnapshot ?? emptySnapshot());
        setActivityHistory(await getManualHealthEntries(user.id));
      } else {
        setSnapshot(emptySnapshot());
        setActivityHistory([]);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Health data could not be loaded. Please try again.');
    }
  }, [profile, user]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({ status, snapshot, error, isDemoMode: DEMO_MODE || user?.id === DEMO_MEMBER_ID, activityHistory, refresh }),
    [activityHistory, error, refresh, snapshot, status, user],
  );

  return <HealthDataContext.Provider value={value}>{children}</HealthDataContext.Provider>;
}

export function useHealthData(): HealthDataContextValue {
  const context = useContext(HealthDataContext);
  if (!context) throw new Error('useHealthData must be used inside HealthDataProvider.');
  return context;
}