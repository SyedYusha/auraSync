import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AIRequest, AIResponse } from '@/types/coach';

const GEMINI_STORAGE_KEY = 'AURASYNC_GEMINI_API_KEY';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : 'http://localhost:3001');
const REQUEST_TIMEOUT_MS = 25_000;

export const COACH_SYSTEM_PROMPT = `You are the AuraSync+ AI Coach — an elite, science-backed fitness and recovery advisor.
Provide a direct, conversational coaching reply tailored to the member's question and biometric data (Recovery Score, Sleep, HRV, Stress, Training Load).

GUIDELINES:
- LENGTH: Write a concise, natural response of at least 1.5 to 3 lines (approximately 2 to 4 complete sentences). Never give a 1-word or single-phrase answer, and avoid overly long essays.
- GROUNDING: Directly cite their specific biometric numbers (such as recovery score, sleep duration, or HRV) to explain why you are recommending this.
- ACTIONABLE: Provide one clear, practical recommendation for today (e.g., high-intensity training, zone 2 cardio, active recovery/mobility, or full rest).
- TONE: Motivating, professional, empathetic, and encouraging.
- SAFETY: Do not provide medical diagnoses or replace medical professionals.
- FORMAT: Plain natural text only. Do not use markdown headers (#), bullet points (*), or JSON.`;

/**
 * Retrieve the Gemini API key from AsyncStorage or environment variables.
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(GEMINI_STORAGE_KEY);
    if (saved?.trim()) return saved.trim();
  } catch {
    // ignore storage read errors
  }

  const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  return envKey?.trim() ?? '';
}

/**
 * Save or clear the custom Gemini API key in AsyncStorage.
 */
export async function setGeminiApiKey(key: string): Promise<void> {
  if (key.trim()) {
    await AsyncStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
  } else {
    await AsyncStorage.removeItem(GEMINI_STORAGE_KEY);
  }
}

/**
 * Direct call to Google Gemini REST API using the client's API key.
 * Tries gemini-2.5-flash first, falling back to gemini-1.5-flash.
 */
async function callGeminiDirectly(apiKey: string, prompt: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.5-flash'];
  let lastError = '';

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: COACH_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        lastError = errorData?.error?.message ?? `Gemini API returned status ${response.status}`;
        continue;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) {
        return reply;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error calling Gemini';
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError || 'Gemini API call failed.');
}

/**
 * Ask the coach: First attempts server endpoint if running;
 * If server is unavailable or returns fallback, automatically falls back to direct Gemini API.
 */
export async function askCoach(request: AIRequest): Promise<AIResponse> {
  const fullPrompt = `${request.healthContext}${
    request.isDemoMode
      ? '\n\nNote: The metrics above are demo/prototype data. Do not claim they were collected from physical wearable hardware.'
      : ''
  }\n\nMember question: ${request.question}`;

  // 1. If backend server is configured, attempt backend first
  if (API_BASE_URL) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as AIResponse;
        if (data.success && !data.fallback) {
          return data;
        }
      }
    } catch {
      // Backend server not running or timed out — proceed to direct Gemini call
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Direct Gemini call if an API key is available
  const geminiKey = await getGeminiApiKey();
  if (geminiKey) {
    try {
      const reply = await callGeminiDirectly(geminiKey, fullPrompt);
      return {
        success: true,
        reply,
        fallback: false,
        provider: 'gemini',
      };
    } catch (error) {
      console.warn('Direct Gemini call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gemini generation error',
        fallback: true,
      };
    }
  }

  // 3. Neither backend nor Gemini key is available
  return {
    success: false,
    error: 'No AI key configured. Enter your Gemini API key to enable live AI responses.',
    fallback: true,
  };
}
