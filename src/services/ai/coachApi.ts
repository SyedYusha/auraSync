import type { AIRequest, AIResponse } from '@/types/coach';

const API_BASE_URL = 'http://localhost:3001';

export async function askCoach(request: AIRequest): Promise<AIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as AIResponse;
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Unable to reach AI Coach. Please try again.',
      fallback: true,
    };
  }
}
