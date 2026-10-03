import type { HealthSnapshot } from '@/types/health';
import type { RecoveryResult } from '@/types/recovery';

export function generateCoachReply(question: string, snapshot: HealthSnapshot, recovery: RecoveryResult): string {
  const normalized = question.toLowerCase().trim();
  const hrv = snapshot.metrics.hrv.value;
  const sleep = snapshot.metrics.sleep.value;
  const stress = snapshot.metrics.stress.value;
  const load = snapshot.metrics.trainingLoad.value;

  // Question about training / workouts
  if (normalized.includes('train') || normalized.includes('workout') || normalized.includes('exercise') || normalized.includes('lift')) {
    if (recovery.readiness === 'Poor') {
      return `With your recovery score at ${recovery.score}/100 and fatigue running ${recovery.fatigueLevel.toLowerCase()}, high-intensity lifting is not advised today. Instead, focus on 20-30 minutes of gentle mobility, foam rolling, or an easy walk to stimulate blood flow without taxing your nervous system.`;
    }
    if (recovery.readiness === 'Moderate') {
      return `Your recovery score is ${recovery.score}/100, which supports moderate effort today. A focused strength session at RPE 6-7 or steady-state Zone 2 cardio for 35-45 minutes will fit your readiness nicely while keeping stress manageable.`;
    }
    return `Your recovery score is an impressive ${recovery.score}/100 with HRV at ${hrv} ms and ${sleep}h of sleep. You are primed for higher intensity loading or heavier compound lifts today — push hard, but ensure you properly warm up and stay hydrated throughout your session!`;
  }

  // Question about resting
  if (normalized.includes('rest')) {
    return recovery.readiness === 'Poor'
      ? `Your recovery readiness is low (${recovery.score}/100), so prioritizing a full rest day with hydration and 8+ hours of sleep is your best move. Taking care of your nervous system now will set you up for a stronger session tomorrow.`
      : `A full rest day is optional since your recovery score is ${recovery.score}/100, backed by ${sleep}h of sleep and stress at ${stress}/100. If you do decide to move, keep it light and restorative, or take the day off if you feel mentally fatigued.`;
  }

  // Question about recovery / score / readiness
  if (normalized.includes('recover') || normalized.includes('score') || normalized.includes('readiness')) {
    return `Your recovery readiness is ${recovery.readiness.toLowerCase()} today at ${recovery.score}/100, with HRV at ${hrv} ms and current fatigue rated ${recovery.fatigueLevel.toLowerCase()}. Your sleep clocked in at ${sleep}h with daily stress at ${stress}/100, meaning you have solid reserves to tackle your scheduled physical tasks.`;
  }

  // Question about sleep
  if (normalized.includes('sleep')) {
    return `You logged ${sleep} hours of sleep last night, contributing to an overall recovery readiness of ${recovery.readiness.toLowerCase()} (${recovery.score}/100). Aim for consistent sleep hygiene tonight, including limiting screen exposure 45 minutes before bed, to maintain optimal autonomic balance.`;
  }

  // Greetings
  if (normalized.startsWith('hi') || normalized.startsWith('hello') || normalized.startsWith('hey')) {
    return `Hello! Today your recovery score is sitting at ${recovery.score}/100 (${recovery.readiness} readiness) with HRV at ${hrv} ms. What's on your agenda today — are you planning a workout, looking for active recovery advice, or checking your daily readiness?`;
  }

  // Fallback by readiness level (guaranteed 2+ lines)
  if (recovery.readiness === 'Poor') {
    return `Your recovery score is ${recovery.score}/100 with high fatigue (${recovery.fatigueLevel.toLowerCase()}), sleep at ${sleep}h, and stress at ${stress}/100. I strongly recommend backing off intense strain today in favor of light stretching, adequate hydration, and restorative sleep.`;
  }

  if (recovery.readiness === 'Moderate') {
    return `Your recovery score is ${recovery.score}/100 (${recovery.readiness.toLowerCase()} readiness), supported by ${sleep}h of sleep and training load at ${load}. A moderate conditioning or maintenance resistance session is appropriate today, adjusting intensity based on how you feel during your warm-up.`;
  }

  return `Your recovery score is ${recovery.score}/100 (${recovery.readiness.toLowerCase()} readiness) with HRV at ${hrv} ms and ${sleep}h of sleep. You have plenty in the tank to hit a challenging workout or hit new targets today — go after it!`;
}
