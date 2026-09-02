import type { HealthDataSourceId, HealthSnapshot } from '@/types/health';

export interface HealthDataSource {
  readonly id: HealthDataSourceId;
  readonly displayName: string;
  readonly isImplemented: boolean;
  getLatestSnapshot(): Promise<HealthSnapshot>;
}
