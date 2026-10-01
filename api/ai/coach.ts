import { generateAIJSON } from '../../server/aiRouter';

type CoachRequest = {
  healthContext: string;
  question: string;
  isDemoMode: boolean;
};

type AIRecommendation = {
  title: string;
  recommendation: string;
  reason: string;
  intensity: string;
  duration: string;
  focus: string;
  recoveryTip: string;
};

const SYSTEM_PROMPT = `You are the AuraSync+ AI Coach — a professional fitness and wellness recommendation engine.

RULES:
- Analyze the supplied fitness metrics carefully.
- Provide personalized, specific workout recommendations.
- Explain WHY you recommend what you do, referencing the actual data.
- Suggest appropriate intensity, duration, and focus areas.
- Include recovery guidance when relevant.
- Never diagnose disease or provide medical advice.
- Never invent biometric measurements.
- Never pretend demo/synthetic data came from a physical wearable.

ALWAYS respond with one valid JSON object and nothing else:
{
  "title": "short workout or advice title",
  "recommendation": "main recommendation text (2-3 sentences)",
  "reason": "why this recommendation was made, referencing the data",
  "intensity": "Low / Moderate / High",
  "duration": "approximate duration in minutes",
  "focus": "muscle groups or focus areas",
  "recoveryTip": "recovery or rest guidance"
}`;

function parseAIResponse(raw: string): AIRecommendation | null {
  try {
    let cleaned = raw.trim();
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock?.[1]) cleaned = codeBlock[1].trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const required = ['title','recommendation','reason','intensity','duration','focus','recoveryTip'];
    if (!required.every((key) => typeof parsed[key] === 'string')) return null;
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed.', fallback: true });
    return;
  }

  const body = req.body as CoachRequest;
  if (!body?.question || !body?.healthContext) {
    res.status(400).json({ success: false, error: 'Missing question or health context.', fallback: true });
    return;
  }

  const demoNote = body.isDemoMode
    ? '\\n\\nIMPORTANT: The data above is demo/synthetic data for prototype purposes. Do not claim it was collected from a physical wearable.'
    : '';

  try {
    const result = await generateAIJSON({
      system: SYSTEM_PROMPT,
      user: `${body.healthContext}${demoNote}\n\nUser Question: ${body.question}`,
      temperature: 0.7,
      maxTokens: 800,
    });

    const recommendation = parseAIResponse(result.content);
    if (!recommendation) throw new Error('AI response did not match the AuraSync+ Coach schema.');

    res.status(200).json({
      success: true,
      recommendation,
      fallback: false,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Vercel AI Coach failed:', error);
    res.status(503).json({
      success: false,
      error: 'AI providers are currently unavailable. AuraSync fallback can be used by the app.',
      fallback: true,
    });
  }
}
