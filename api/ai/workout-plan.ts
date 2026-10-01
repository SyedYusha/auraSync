import { generateAIJSON } from '../../server/aiRouter';

type WorkoutPlanRequest = {
  healthContext?: string;
  profileContext?: string;
  recentWorkouts?: string;
  isDemoMode?: boolean;
};

type PlannedExercise = { name: string; sets: number; reps: number };

type WorkoutPlan = {
  title: string;
  intensity: string;
  durationMin: number;
  focus: string;
  reason: string;
  recoveryTip: string;
  exercises: PlannedExercise[];
};

const SYSTEM_PROMPT = `You are the AuraSync+ Workout Planner. Design one practical training session for today.

RULES:
- Base the session on the supplied recovery score, HRV, sleep, stress, training load, fitness goal, fitness level and recent workout context.
- Higher recovery can support higher intensity; lower recovery should reduce intensity and volume.
- Prefer exercises from the supplied AuraSync+ exercise library when possible.
- Do not invent biometric measurements.
- Do not diagnose disease or provide medical advice.
- Never claim demo/synthetic data came from a physical wearable.
- Return 3 to 8 exercises with sensible sets and reps.

ALWAYS respond with one valid JSON object and nothing else:
{
  "title": "short session title",
  "intensity": "Low / Moderate / High",
  "durationMin": 30,
  "focus": "muscle groups separated by •",
  "reason": "why this session fits today, referencing supplied data",
  "recoveryTip": "one short recovery guidance sentence",
  "exercises": [{"name":"exercise name","sets":3,"reps":10}]
}`;

function parsePlan(raw: string): WorkoutPlan | null {
  try {
    let cleaned = raw.trim();
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock?.[1]) cleaned = codeBlock[1].trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    for (const key of ['title','intensity','focus','reason','recoveryTip'] as const) {
      if (typeof parsed[key] !== 'string' || !(parsed[key] as string).trim()) return null;
    }
    const durationMin = Number(parsed.durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 10 || durationMin > 180) return null;
    if (!Array.isArray(parsed.exercises) || parsed.exercises.length < 3 || parsed.exercises.length > 8) return null;
    const exercises: PlannedExercise[] = [];
    for (const item of parsed.exercises) {
      if (typeof item !== 'object' || item === null) return null;
      const value = item as Record<string, unknown>;
      if (typeof value.name !== 'string' || !value.name.trim()) return null;
      const sets = Number(value.sets);
      const reps = Number(value.reps);
      if (!Number.isFinite(sets) || !Number.isFinite(reps) || sets < 1 || sets > 10 || reps < 1 || reps > 50) return null;
      exercises.push({ name: value.name.trim(), sets: Math.round(sets), reps: Math.round(reps) });
    }
    return {
      title: parsed.title as string,
      intensity: parsed.intensity as string,
      durationMin: Math.round(durationMin),
      focus: parsed.focus as string,
      reason: parsed.reason as string,
      recoveryTip: parsed.recoveryTip as string,
      exercises,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed.', fallback: true });
    return;
  }

  const body = req.body as WorkoutPlanRequest;
  if (!body?.healthContext) {
    res.status(400).json({ success: false, error: 'Missing health context.', fallback: true });
    return;
  }

  const demoNote = body.isDemoMode
    ? '\\n\\nIMPORTANT: The metrics above are demo/synthetic data for prototype purposes. Do not claim they were collected from a physical wearable.'
    : '';

  try {
    const result = await generateAIJSON({
      system: SYSTEM_PROMPT,
      user: `${body.healthContext}${demoNote}

Member Profile: ${body.profileContext || 'Not provided'}
Recent Workouts: ${body.recentWorkouts || 'No recent workouts recorded.'}

Design today's training session.`,
      temperature: 0.7,
      maxTokens: 900,
    });

    const plan = parsePlan(result.content);
    if (!plan) throw new Error(`AI response from ${result.provider} did not match the workout plan schema.`);

    res.status(200).json({ success: true, plan, fallback: false, provider: result.provider });
  } catch (error) {
    console.error('Vercel AI Workout Plan failed:', error);
    res.status(503).json({
      success: false,
      error: 'AI providers are currently unavailable. AuraSync fallback can be used by the app.',
      fallback: true,
    });
  }
}
