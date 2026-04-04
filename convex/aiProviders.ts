import { toErrorMessage } from './errors';

export type ChatProviderKind = 'mimo' | 'openai';

export type ChatProviderConfig = {
  provider: ChatProviderKind;
  apiKey: string;
  model: string;
  baseURL?: string;
};

type EnvLike = Record<string, string | undefined>;

const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

const readValue = (env: EnvLike, key: string): string | undefined => {
  const value = env[key];
  return value?.trim() ? value.trim() : undefined;
};

export function resolveChatProviderConfigs(env: EnvLike): ChatProviderConfig[] {
  const configs: ChatProviderConfig[] = [];

  const mimoApiKey = readValue(env, 'MIMO_API_KEY');
  if (mimoApiKey) {
    configs.push({
      provider: 'mimo',
      apiKey: mimoApiKey,
      model: readValue(env, 'MIMO_CHAT_MODEL') || DEFAULT_MIMO_MODEL,
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

export function isModelAccessError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('model_not_found') ||
    message.includes('does not exist or you do not have access to it') ||
    message.includes('unknown model') ||
    message.includes('unsupported model')
  );
}
