import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { calculateRecoveryScore } from '@/domain/recovery/calculateRecoveryScore';
import { requestWorkoutPlan } from '@/services/workouts/workoutPlanService';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import type { WorkoutPlan } from '@/types/workout';

export type WorkoutPlanStatus = 'loading' | 'ready' | 'error';

interface WorkoutPlanContextValue {
  readonly status: WorkoutPlanStatus;
  readonly plan: WorkoutPlan | null;
  readonly recoveryScore: number | null;
  readonly readiness: string | null;
  readonly error: string | null;
  refresh(): Promise<void>;
}

const WorkoutPlanContext = createContext<WorkoutPlanContextValue | null>(null);

export function WorkoutPlanProvider({ children }: PropsWithChildren) {
  const { authStatus, user, profile } = useAuth();
  const { status: healthStatus, snapshot } = useHealthData();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<WorkoutPlanStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const recovery = useMemo(() => (snapshot ? calculateRecoveryScore(snapshot.recoveryInputs) : null), [snapshot]);
  const canLoad = authStatus === 'authenticated' && healthStatus === 'ready' && snapshot !== null && user !== null;

  const refresh = useCallback(async () => {
    if (!canLoad || !snapshot || !user || !recovery) {
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const workouts = await workoutService.getWorkouts(user.id);
      const metrics = snapshot.metrics;
      const nextPlan = await requestWorkoutPlan({
        recoveryScore: recovery.score,
        readiness: recovery.readiness,
        hrv: metrics.hrv.value,
        sleepScore: metrics.sleepScore.value,
        stress: metrics.stress.value,
        trainingLoad: metrics.trainingLoad.value,
        fitnessGoal: profile?.fitnessGoal ?? 'General Fitness',
        fitnessLevel: profile?.fitnessLevel ?? 'Beginner',
        lastWorkoutType: workouts[0]?.type ?? null,
        isDemoMode: snapshot.isSynthetic,
      });

      setPlan(nextPlan);
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Could not build today’s workout plan. Please try again.');
    }
  }, [canLoad, profile, recovery, snapshot, user]);

  useEffect(() => {
    const timeout = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const value = useMemo(
    () => ({
      status: canLoad ? status : 'loading',
      plan,
      recoveryScore: recovery?.score ?? null,
      readiness: recovery?.readiness ?? null,
      error,
      refresh,
    }),
    [canLoad, error, plan, recovery?.readiness, recovery?.score, refresh, status],
  );

  return <WorkoutPlanContext.Provider value={value}>{children}</WorkoutPlanContext.Provider>;
}

export function useWorkoutPlan(): WorkoutPlanContextValue {
  const context = useContext(WorkoutPlanContext);
  if (!context) {
    throw new Error('useWorkoutPlan must be used inside WorkoutPlanProvider.');
  }
  return context;
}
