import { toErrorMessage } from './errors';

export type ChatProviderKind = 'mimo' | 'openai';

export type ChatProviderConfig = {
  provider: ChatProviderKind;
  apiKey: string;
  model: string;
  baseURL?: string;
};

export type ChatProviderRequirements = {
  vision?: boolean;
};

export type FastChatCompletionOptions = {
  max_completion_tokens: number;
  thinking?: { type: 'disabled' };
};

type EnvLike = Record<string, string | undefined>;

const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';
const DEFAULT_MIMO_VISION_MODEL = 'mimo-v2.5';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

const readValue = (env: EnvLike, key: string): string | undefined => {
  const value = env[key];
  return value?.trim() ? value.trim() : undefined;
};

export function resolveChatProviderConfigs(
  env: EnvLike,
  requirements: ChatProviderRequirements = {}
): ChatProviderConfig[] {
  const configs: ChatProviderConfig[] = [];

  const mimoApiKey = readValue(env, 'MIMO_API_KEY');
  if (mimoApiKey) {
    configs.push({
      provider: 'mimo',
      apiKey: mimoApiKey,
      model: requirements.vision
        ? readValue(env, 'MIMO_VISION_MODEL') || DEFAULT_MIMO_VISION_MODEL
        : readValue(env, 'MIMO_CHAT_MODEL') || DEFAULT_MIMO_MODEL,
      baseURL: readValue(env, 'MIMO_API_BASE_URL') || DEFAULT_MIMO_BASE_URL,
    });
  }

  const openaiApiKey = readValue(env, 'OPENAI_API_KEY');
  if (openaiApiKey) {
    configs.push({
      provider: 'openai',
      apiKey: openaiApiKey,
      model: readValue(env, 'OPENAI_CHAT_MODEL') || DEFAULT_OPENAI_MODEL,
    });
  }

  return configs;
}

export function buildFastChatCompletionOptions(
  provider: ChatProviderConfig,
  maxCompletionTokens: number
): FastChatCompletionOptions {
  const normalizedLimit = Math.max(64, Math.min(16_384, Math.floor(maxCompletionTokens)));
  return {
    max_completion_tokens: normalizedLimit,
    ...(provider.provider === 'mimo' ? { thinking: { type: 'disabled' as const } } : {}),
  };
}

export function isModelAccessError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('model_not_found') ||
    message.includes('does not exist or you do not have access to it') ||
    message.includes('unknown model') ||
    message.includes('unsupported model')
  );
}
