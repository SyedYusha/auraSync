import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1)/ }));
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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`AuraSync+ AI server running on http://localhost:${port}`);
  console.log(`DeepSeek API configured: ${Boolean(process.env.DEEPSEEK_API_KEY)}`);
});
