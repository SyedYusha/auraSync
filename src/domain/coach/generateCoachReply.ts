import type { HealthSnapshot } from '@/types/health';
import type { RecoveryResult } from '@/types/recovery';

export function generateCoachReply(question: string, snapshot: HealthSnapshot, recovery: RecoveryResult): string {
  const normalized = question.toLowerCase();
  const hrv = snapshot.metrics.hrv.value;
  const sleep = snapshot.metrics.sleep.value;
  const stress = snapshot.metrics.stress.value;

  if (normalized.includes('rest')) {
    return recovery.readiness === 'Poor'
      ? 'Yes. Your current readiness is low, so prioritize rest, hydration, and an easy walk today.'
      : `You do not need a full rest day today. Your recovery is ${recovery.score}, with ${sleep} hours of sleep and low stress. Keep intensity purposeful and listen to your body.`;
  }

  if (normalized.includes('recover')) {
    return `You are ${recovery.readiness.toLowerCase()}ly recovered today. Your score is ${recovery.score}, HRV is ${hrv} ms, and stress is ${stress}/100. Your current fatigue level is ${recovery.fatigueLevel.toLowerCase()}.`;
  }

  return `Your recovery score is ${recovery.score}, with strong sleep and low stress. I recommend a high-intensity upper-body session today. Focus on chest, back, and shoulders for 52 minutes.`;
}
