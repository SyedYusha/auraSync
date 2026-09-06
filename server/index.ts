import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

const app = express();
// Allow localhost plus private LAN IPs so devices on the same Wi-Fi (phone browsers,
// Expo Go web views) can reach the server during local development
const corsOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})(:\d+)?$/;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const SYSTEM_PROMPT = `You are the AuraSync+ AI Coach — a professional fitness and wellness recommendation engine.

RULES:
- Analyze the supplied fitness metrics carefully.
- Provide personalized, specific workout recommendations.
- Explain WHY you recommend what you do, referencing the actual data.
- Suggest appropriate intensity, duration, and focus areas.
- Include recovery guidance when relevant.

YOU MUST NOT:
- Diagnose diseases or provide medical advice.
- Claim to prevent injuries with certainty.
- Replace a doctor or medical professional.
- Invent biometric measurements not provided.
- Pretend the data came from a physical wearable if it is marked as demo/synthetic.
- Use absolute medical language.

USE LANGUAGE SUCH AS:
- "Based on your current fitness data..."
- "Your recovery indicators suggest..."
- "This is a fitness-readiness recommendation, not medical advice."

ALWAYS respond with a single valid JSON object and nothing else:
{
  "title": "short workout or advice title",
  "recommendation": "main recommendation text (2-3 sentences)",
  "reason": "why this recommendation was made, referencing the data",
  "intensity": "Low / Moderate / High",
  "duration": "approximate duration in minutes",
  "focus": "muscle groups or focus areas",
  "recoveryTip": "recovery or rest guidance"
}`;

interface CoachRequest {
  healthContext: string;
  question: string;
  isDemoMode: boolean;
}

interface AIRecommendation {
  title: string;
  recommendation: string;
  reason: string;
  intensity: string;
  duration: string;
  focus: string;
  recoveryTip: string;
}

interface CoachResponse {
  success: boolean;
  recommendation?: AIRecommendation;
  error?: string;
  fallback: boolean;
}

function parseAIResponse(raw: string): AIRecommendation | null {
  try {
    let cleaned = raw.trim();
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock?.[1]) {
      cleaned = codeBlock[1].trim();
    }
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const required: (keyof AIRecommendation)[] = [
      'title', 'recommendation', 'reason', 'intensity', 'duration', 'focus', 'recoveryTip',
    ];
    for (const key of required) {
      if (typeof parsed[key] !== 'string') return null;
    }
    return {
      title: parsed.title as string,
      recommendation: parsed.recommendation as string,
      reason: parsed.reason as string,
      intensity: parsed.intensity as string,
      duration: parsed.duration as string,
      focus: parsed.focus as string,
      recoveryTip: parsed.recoveryTip as string,
    };
  } catch {
    return null;
  }
}

app.post('/api/coach', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: 'AI service not configured. Set DEEPSEEK_API_KEY in the server environment.',
      fallback: true,
    } satisfies CoachResponse);
    return;
  }

  const body = req.body as CoachRequest;
  if (!body?.question || !body?.healthContext) {
    res.status(400).json({
      success: false,
      error: 'Missing question or health context.',
      fallback: true,
    } satisfies CoachResponse);
    return;
  }

  const demoNote = body.isDemoMode
    ? '\n\nIMPORTANT: The data above is demo/synthetic data for prototype purposes. Do not claim it was collected from a physical wearable.'
    : '';

  const userMessage = `${body.healthContext}${demoNote}\n\nUser Question: ${body.question}`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API error (${response.status}):`, errorText);
      res.status(502).json({
        success: false,
        error: `AI provider returned an error. Please try again.`,
        fallback: true,
      } satisfies CoachResponse);
      return;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      res.status(502).json({
        success: false,
        error: 'AI returned an empty response.',
        fallback: true,
      } satisfies CoachResponse);
      return;
    }

    const recommendation = parseAIResponse(rawContent);
    if (!recommendation) {
      console.error('Failed to parse AI response:', rawContent);
      res.status(502).json({
        success: false,
        error: 'AI response could not be parsed.',
        fallback: true,
      } satisfies CoachResponse);
      return;
    }

    res.json({
      success: true,
      recommendation,
      fallback: false,
    } satisfies CoachResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI request failed:', message);
    res.status(500).json({
      success: false,
      error: 'AI service is currently unavailable.',
      fallback: true,
    } satisfies CoachResponse);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
  });
});

const WORKOUT_PLAN_PROMPT = `You are the AuraSync+ Workout Planner. You design one training session for today.

RULES:
- Base the session on the supplied recovery score, HRV, sleep, stress, training load, fitness goal, fitness level and previous workout.
- High recovery (75+) supports a High intensity session; lower recovery must reduce intensity and volume.
- Pick 5 exercises that match the focus area and the member's fitness level.
- You MUST NOT invent biometric measurements that were not supplied, and must not give medical advice.

ALWAYS respond with a single valid JSON object and nothing else:
{
  "title": "short session title",
  "intensity": "Low / Moderate / High",
  "durationMin": 30-60,
  "focus": "muscle groups separated by • , e.g. Chest • Back • Shoulders",
  "reason": "why this session fits today, referencing the supplied data",
  "recoveryTip": "one short recovery guidance sentence",
  "exercises": [
    { "name": "exercise name", "sets": 4, "reps": 8 }
  ]
}`;

interface WorkoutPlanRequest {
  healthContext?: string;
  profileContext?: string;
  recentWorkouts?: string;
  isDemoMode?: boolean;
}

interface PlannedExerciseAI {
  name: string;
  sets: number;
  reps: number;
}

interface WorkoutPlanAI {
  title: string;
  intensity: string;
  durationMin: number;
  focus: string;
  reason: string;
  recoveryTip: string;
  exercises: PlannedExerciseAI[];
}

interface WorkoutPlanResponse {
  success: boolean;
  plan?: WorkoutPlanAI;
  error?: string;
  fallback: boolean;
}

function parseWorkoutPlan(raw: string): WorkoutPlanAI | null {
  try {
    let cleaned = raw.trim();
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock?.[1]) {
      cleaned = codeBlock[1].trim();
    }
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    for (const key of ['title', 'intensity', 'focus', 'reason', 'recoveryTip'] as const) {
      if (typeof parsed[key] !== 'string') return null;
    }
    const durationMin = Number(parsed.durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 10 || durationMin > 180) return null;
    if (!Array.isArray(parsed.exercises) || parsed.exercises.length < 3 || parsed.exercises.length > 10) return null;

    const exercises: PlannedExerciseAI[] = [];
    for (const entry of parsed.exercises) {
      if (typeof entry !== 'object' || entry === null) return null;
      const candidate = entry as Record<string, unknown>;
      if (typeof candidate.name !== 'string' || candidate.name.trim() === '') return null;
      const sets = Number(candidate.sets);
      const reps = Number(candidate.reps);
      if (!Number.isFinite(sets) || !Number.isFinite(reps) || sets < 1 || sets > 10 || reps < 1 || reps > 50) return null;
      exercises.push({ name: candidate.name.trim(), sets: Math.round(sets), reps: Math.round(reps) });
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

app.post('/api/workout-plan', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: 'AI service not configured. Set DEEPSEEK_API_KEY in the server environment.',
      fallback: true,
    } satisfies WorkoutPlanResponse);
    return;
  }

  const body = req.body as WorkoutPlanRequest;
  if (!body?.healthContext) {
    res.status(400).json({
      success: false,
      error: 'Missing health context.',
      fallback: true,
    } satisfies WorkoutPlanResponse);
    return;
  }

  const demoNote = body.isDemoMode
    ? '\n\nIMPORTANT: The metrics above are demo/synthetic data for prototype purposes. Do not claim they were collected from a physical wearable.'
    : '';

  const userMessage = `${body.healthContext}${demoNote}

Member Profile: ${body.profileContext || 'Not provided'}

Recent Workouts: ${body.recentWorkouts || 'No recent workouts recorded.'}

Design today's training session.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: WORKOUT_PLAN_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API error (${response.status}):`, errorText);
      res.status(502).json({
        success: false,
        error: 'AI provider returned an error. Please try again.',
        fallback: true,
      } satisfies WorkoutPlanResponse);
      return;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      res.status(502).json({
        success: false,
        error: 'AI returned an empty response.',
        fallback: true,
      } satisfies WorkoutPlanResponse);
      return;
    }

    const plan = parseWorkoutPlan(rawContent);
    if (!plan) {
      console.error('Failed to parse workout plan response:', rawContent);
      res.status(502).json({
        success: false,
        error: 'AI response could not be parsed.',
        fallback: true,
      } satisfies WorkoutPlanResponse);
      return;
    }

    res.json({
      success: true,
      plan,
      fallback: false,
    } satisfies WorkoutPlanResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Workout plan request failed:', message);
    res.status(500).json({
      success: false,
      error: 'AI service is currently unavailable.',
      fallback: true,
    } satisfies WorkoutPlanResponse);
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`AuraSync+ AI server running on http://localhost:${port}`);
  console.log(`DeepSeek API configured: ${Boolean(process.env.DEEPSEEK_API_KEY)}`);
});
