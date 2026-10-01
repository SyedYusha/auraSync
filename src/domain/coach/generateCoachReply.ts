import type { HealthSnapshot } from '@/types/health';
import type { RecoveryResult } from '@/types/recovery';

export function generateCoachReply(question: string, snapshot: HealthSnapshot, recovery: RecoveryResult): string {
  const normalized = question.toLowerCase();
  const hrv = snapshot.metrics.hrv.value;
  const sleep = snapshot.metrics.sleep.value;
  const stress = snapshot.metrics.stress.value;

  if (normalized.includes('rest')) {
    return recovery.readiness === 'Poor'
      ? `Your recovery readiness is low (${recovery.score}), so prioritize rest, hydration, and an easy walk today.`
      : `A full rest day is optional based on your recovery score of ${recovery.score}, ${sleep}h of sleep, and stress at ${stress}/100. If you do train, keep intensity purposeful and listen to your body.`;
  }

  if (normalized.includes('recover')) {
    return `Your recovery readiness is ${recovery.readiness.toLowerCase()} today. Your score is ${recovery.score}, HRV is ${hrv} ms, and stress is ${stress}/100. Your current fatigue level is ${recovery.fatigueLevel.toLowerCase()}.`;
  }

  if (recovery.readiness === 'Poor') {
    return `Your recovery score is ${recovery.score} (${recovery.readiness.toLowerCase()} readiness) with a fatigue level of ${recovery.fatigueLevel.toLowerCase()}. Sleep was ${sleep}h and stress is ${stress}/100. Prioritize recovery or low-strain mobility today rather than heavy loading.`;
  }

  if (recovery.readiness === 'Moderate') {
    return `Your recovery score is ${recovery.score} (${recovery.readiness.toLowerCase()} readiness). Sleep is ${sleep}h with stress at ${stress}/100. A moderate session or steady-state aerobic conditioning is appropriate today. Adjust volume according to how your warm-up feels.`;
  }

  return `Your recovery score is ${recovery.score} (${recovery.readiness.toLowerCase()} readiness) with HRV at ${hrv} ms and ${sleep}h of sleep. You are primed for higher intensity training today. Select a session aligned with your active training plan.`;
}
