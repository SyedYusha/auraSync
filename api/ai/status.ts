import { getAIProviderStatus } from '../../server/aiRouter';

export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    providers: getAIProviderStatus(),
    order: (process.env.AI_PROVIDER_ORDER || 'openai,gemini,deepseek')
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean),
  });
}
