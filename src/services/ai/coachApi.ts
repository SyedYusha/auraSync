import { Platform } from 'react-native';
import type { AIRequest, AIResponse } from '@/types/coach';

// Web falls back to localhost; for physical devices set EXPO_PUBLIC_API_URL
// to your PC's LAN IP (e.g. http://192.168.1.5:3001) in .env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : 'http://localhost:3001');
const REQUEST_TIMEOUT_MS = 30_000;

export async function askCoach(request: AIRequest): Promise<AIResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const data = (await response.json()) as AIResponse;
    if (!response.ok) {
      return { success: false, error: data.error ?? 'AI Coach is temporarily unavailable.', fallback: true };
    }
    return data;
  } catch {
    return {
      success: false,
      error: 'Unable to reach AI Coach. Please try again.',
      fallback: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
