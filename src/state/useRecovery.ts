import { useMemo } from 'react';

import { calculateRecoveryScore } from '@/domain/recovery/calculateRecoveryScore';
import type { HealthSnapshot } from '@/types/health';

export function useRecovery(snapshot: HealthSnapshot) {
  return useMemo(() => calculateRecoveryScore(snapshot.recoveryInputs), [snapshot]);
}
