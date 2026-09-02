import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { demoHealthDataSource } from '@/services/health/DemoHealthDataSource';
import type { HealthSnapshot } from '@/types/health';

export type HealthDataStatus = 'loading' | 'ready' | 'error';

interface HealthDataContextValue {
  readonly status: HealthDataStatus;
  readonly snapshot: HealthSnapshot | null;
  readonly error: string | null;
  refresh(): Promise<void>;
}

const HealthDataContext = createContext<HealthDataContextValue | null>(null);

export function HealthDataProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<HealthDataStatus>('loading');
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const nextSnapshot = await demoHealthDataSource.getLatestSnapshot();
      setSnapshot(nextSnapshot);
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Demo health data could not be loaded. Please try again.');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({ status, snapshot, error, refresh }),
    [error, refresh, snapshot, status],
  );

  return <HealthDataContext.Provider value={value}>{children}</HealthDataContext.Provider>;
}

export function useHealthData(): HealthDataContextValue {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error('useHealthData must be used inside HealthDataProvider.');
  }
  return context;
}
