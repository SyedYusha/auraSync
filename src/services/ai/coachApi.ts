import type { AIRequest, AIResponse } from '@/types/coach';

// Web falls back to localhost; for physical devices set EXPO_PUBLIC_API_URL
// to your PC's LAN IP (e.g. http://192.168.1.5:3001) in .env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function askCoach(request: AIRequest): Promise<AIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as AIResponse;
    return data;
  } catch {
    return {
      success: false,
      error: 'Unable to reach AI Coach. Please try again.',
      fallback: true,
    };
  }
}
