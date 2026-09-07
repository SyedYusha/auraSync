import { isSupabaseConfigured, supabase } from '@/services/auth/supabaseClient';
import type { RetentionRecommendation, RetentionRecommendationInput } from '@/types/gym';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type ServerRecommendation = Omit<RetentionRecommendation, 'isFallback'>;

interface RetentionRecommendationResponse {
  readonly success: boolean;
  readonly recommendation?: ServerRecommendation;
  readonly error?: string;
  readonly fallback: boolean;
}

function isValidRecommendation(value: ServerRecommendation | undefined): value is ServerRecommendation {
  return value !== undefined
    && typeof value.title === 'string'
    && typeof value.priority === 'string'
    && typeof value.reason === 'string'
    && typeof value.suggestedAction === 'string'
    && typeof value.outreachMessage === 'string';
}

export function buildFallbackRetentionRecommendation(input: RetentionRecommendationInput): RetentionRecommendation {
  if (input.churn.riskLevel === 'high') {
    return {
      title: 'Reconnect with a personal goal check-in',
      priority: 'High priority',
      reason: `${input.member.fullName} has a high attendance-risk signal based on recent visit patterns.`,
      suggestedAction: 'Ask a coach to review their original goal and offer a short, low-pressure plan for returning this week.',
      outreachMessage: `Hi ${input.member.fullName}, we would love to help you get back to your ${input.member.fitnessGoal.toLowerCase()} routine. Would a short goal check-in with a coach this week be useful?`,
      isFallback: true,
    };
  }

  if (input.churn.riskLevel === 'medium') {
    return {
      title: 'Invite a simple return visit',
      priority: 'Review this week',
      reason: `${input.member.fullName}'s recent attendance has slowed compared with their earlier activity.`,
      suggestedAction: 'Invite them to a coach-led session or class that aligns with their stated goal, then review their response personally.',
      outreachMessage: `Hi ${input.member.fullName}, we have a session this week that could support your ${input.member.fitnessGoal.toLowerCase()} goal. Would you like the details?`,
      isFallback: true,
    };
  }

  return {
    title: 'Maintain a positive training rhythm',
    priority: 'Low priority',
    reason: `${input.member.fullName} is maintaining a recent attendance pattern.`,
    suggestedAction: 'Recognise their consistency during the next coach interaction and ask whether their current schedule still fits.',
    outreachMessage: `Hi ${input.member.fullName}, great consistency with your training recently. Is your current schedule still working for your ${input.member.fitnessGoal.toLowerCase()} goal?`,
    isFallback: true,
  };
}

export async function requestRetentionRecommendation(input: RetentionRecommendationInput): Promise<RetentionRecommendation> {
  if (!isSupabaseConfigured || !supabase) {
    return buildFallbackRetentionRecommendation(input);
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return buildFallbackRetentionRecommendation(input);
    }

    const response = await fetch(`${API_BASE_URL}/api/retention-recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        member: {
          name: input.member.fullName,
          fitnessGoal: input.member.fitnessGoal,
        },
        attendance: input.attendance,
        churn: input.churn,
        isDemoMode: true,
      }),
    });
    const data = (await response.json()) as RetentionRecommendationResponse;
    if (data.success && isValidRecommendation(data.recommendation)) {
      return { ...data.recommendation, isFallback: false };
    }
  } catch {
    // Fall through to the deterministic demo recommendation.
  }

  return buildFallbackRetentionRecommendation(input);
}
