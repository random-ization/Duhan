/**
 * AI Chat client and provider management.
 *
 * Extracted from convex/ai.ts for readability.
 * Uses the OpenAI SDK (compatible with OpenAI, Mimo, and other providers).
 */

import OpenAI from 'openai';
import type { ChatProviderConfig } from '../aiProviders';
import { resolveChatProviderConfigs } from '../aiProviders';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatCompletionLike = OpenAI.Chat.Completions.ChatCompletion;

export type ChatCompletionWithProvider<T extends ChatCompletionLike = ChatCompletionLike> = {
  completion: T;
  provider: ChatProviderConfig;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/** Create an OpenAI-compatible client for the given provider config. */
export function createChatClient(config: ChatProviderConfig, timeout = 25000): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    timeout,
  });
}

/**
 * Run a chat completion request across a fallback chain of providers.
 *
 * Iterates through configured providers; if one fails, the next is tried.
 * On success the raw completion **and** the provider that served it are
 * returned so callers can log usage accurately.
 */
export async function runChatCompletionWithFallback<T extends ChatCompletionLike>(
  request: (args: { client: OpenAI; provider: ChatProviderConfig }) => Promise<T>,
  options?: { label?: string; timeoutMs?: number }
): Promise<ChatCompletionWithProvider<T>> {
  const providers = resolveChatProviderConfigs(process.env);
  if (providers.length === 0) {
    throw new Error('No AI chat provider configured');
  }

  let lastError: unknown;

  for (const provider of providers) {
    try {
      const client = createChatClient(provider, options?.timeoutMs ?? 25000);
      const completion = await request({ client, provider });
      return { completion, provider };
    } catch (error) {
      lastError = error;
      console.warn(
        `[AI] ${options?.label || 'chat_completion'} failed on ${provider.provider}:${provider.model}: ${toErrorMessage(error)}`
      );

      // Try the next provider for model access issues and transient outages.
      if (provider !== providers[providers.length - 1]) {
        continue;
      }
    }
  }

  throw lastError ?? new Error('All AI chat providers failed');
}
