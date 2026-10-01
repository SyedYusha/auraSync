type AIProvider = 'openai' | 'gemini' | 'deepseek';

interface ProviderConfig {
  readonly id: AIProvider;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

interface GenerateJSONInput {
  readonly system: string;
  readonly user: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

interface ProviderResult {
  readonly provider: AIProvider;
  readonly content: string;
}

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_PROMPT_CHARS = 24_000;
const MAX_RESPONSE_CHARS = 40_000;

function providerConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [
    {
      id: 'openai',
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    },
    {
      id: 'gemini',
      apiKey: process.env.GEMINI_API_KEY ?? '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    },
    {
      id: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY ?? '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
  ];

  const order = (process.env.AI_PROVIDER_ORDER || 'openai,gemini,deepseek')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is AIProvider => value === 'openai' || value === 'gemini' || value === 'deepseek');

  const byId = new Map(configs.map((config) => [config.id, config]));
  return order.map((id) => byId.get(id)).filter((config): config is ProviderConfig => Boolean(config));
}

async function callProvider(config: ProviderConfig, input: GenerateJSONInput): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl.replace(/\\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: input.system.slice(0, MAX_PROMPT_CHARS) },
        { role: 'user', content: input.user.slice(0, MAX_PROMPT_CHARS) },
      ],
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 800,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.id} provider error (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${config.id} returned an empty response`);
  if (content.length > MAX_RESPONSE_CHARS) throw new Error(`${config.id} returned an oversized response`);
  return content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${config.id} provider timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAIJSON(input: GenerateJSONInput): Promise<ProviderResult> {
  if (!input.system.trim() || !input.user.trim()) {
    throw new Error('AI request content cannot be empty.');
  }
  const configured = providerConfigs().filter((config) => Boolean(config.apiKey));
  if (configured.length === 0) {
    throw new Error('No AI providers are configured. Add at least one server-side provider API key.');
  }

  const errors: string[] = [];
  for (const provider of configured) {
    try {
      const content = await callProvider(provider, input);
      return { provider: provider.id, content };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${provider.id} failed`);
      console.error(errors.at(-1));
    }
  }

  throw new Error(`All configured AI providers failed. ${errors.join(' | ')}`);
}

export function getAIProviderStatus() {
  return providerConfigs().map((config) => ({
    id: config.id,
    configured: Boolean(config.apiKey),
    model: config.model,
  }));
}
