export interface AIRecommendation {
  readonly title: string;
  readonly recommendation: string;
  readonly reason: string;
  readonly intensity: string;
  readonly duration: string;
  readonly focus: string;
  readonly recoveryTip: string;
}

export interface AIRequest {
  readonly healthContext: string;
  readonly question: string;
  readonly isDemoMode: boolean;
}

export interface AIResponse {
  readonly success: boolean;
  readonly recommendation?: AIRecommendation;
  readonly error?: string;
  readonly fallback: boolean;
}

export interface HealthContext {
  readonly recovery: number;
  readonly readiness: string;
  readonly fatigue: string;
  readonly sleep: number;
  readonly hrv: number;
  readonly stress: number;
  readonly trainingLoad: number;
  readonly heartRate: number;
  readonly sourceId: string;
  readonly isSynthetic: boolean;
}
