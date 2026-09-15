import { describe, expect, it } from 'vitest';
import {
  buildFastChatCompletionOptions,
  isModelAccessError,
  resolveChatProviderConfigs,
} from '../../convex/aiProviders';

describe('resolveChatProviderConfigs', () => {
  it('prefers MIMO and keeps OpenAI as fallback when both are configured', () => {
    const configs = resolveChatProviderConfigs({
      MIMO_API_KEY: 'mimo-key',
      MIMO_API_BASE_URL: 'https://mimo.example/v1',
      MIMO_CHAT_MODEL: 'mimo-custom',
      OPENAI_API_KEY: 'openai-key',
      OPENAI_CHAT_MODEL: 'gpt-4.1-mini',
    });

    expect(configs).toEqual([
      {
        provider: 'mimo',
        apiKey: 'mimo-key',
        baseURL: 'https://mimo.example/v1',
        model: 'mimo-custom',
      },
      {
        provider: 'openai',
        apiKey: 'openai-key',
        model: 'gpt-4.1-mini',
      },
    ]);
  });

  it('uses OpenAI defaults when only OpenAI is configured', () => {
    const configs = resolveChatProviderConfigs({
      OPENAI_API_KEY: 'openai-key',
    });

    expect(configs).toEqual([
      {
        provider: 'openai',
        apiKey: 'openai-key',
        model: 'gpt-4o-mini',
      },
    ]);
  });

  it('uses MIMO defaults when only MIMO is configured', () => {
    const configs = resolveChatProviderConfigs({
      MIMO_API_KEY: 'mimo-key',
    });

    expect(configs).toEqual([
      {
        provider: 'mimo',
        apiKey: 'mimo-key',
        baseURL: 'https://api.xiaomimimo.com/v1',
        model: 'mimo-v2.5-pro',
      },
    ]);
  });

  it('selects the multimodal MIMO model when vision is required', () => {
    const configs = resolveChatProviderConfigs({ MIMO_API_KEY: 'mimo-key' }, { vision: true });

    expect(configs[0]).toMatchObject({ provider: 'mimo', model: 'mimo-v2.5' });
  });
});

describe('buildFastChatCompletionOptions', () => {
  it('disables MIMO thinking and clamps the output budget', () => {
    expect(
      buildFastChatCompletionOptions(
        { provider: 'mimo', apiKey: 'key', model: 'mimo-v2.5-pro' },
        900
      )
    ).toEqual({ max_completion_tokens: 900, thinking: { type: 'disabled' } });
  });

  it('does not send MIMO-only options to OpenAI', () => {
    expect(
      buildFastChatCompletionOptions({ provider: 'openai', apiKey: 'key', model: 'gpt-4o-mini' }, 32)
    ).toEqual({ max_completion_tokens: 64 });
  });
});

describe('isModelAccessError', () => {
  it('detects missing model access errors', () => {
    expect(
      isModelAccessError(
        new Error('404 The model `mimo-v2-flash` does not exist or you do not have access to it.')
      )
    ).toBe(true);
  });

  it('ignores unrelated request failures', () => {
    expect(isModelAccessError(new Error('socket hang up'))).toBe(false);
  });
});
