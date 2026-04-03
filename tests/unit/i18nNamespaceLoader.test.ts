import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addResourceBundleMock, warnMock } = vi.hoisted(() => ({
  addResourceBundleMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock('../../src/utils/i18next-config', () => ({
  default: {
    addResourceBundle: addResourceBundleMock,
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    warn: warnMock,
  },
}));

import { ensureLocaleNamespaces } from '../../src/utils/i18nNamespaceLoader';

describe('ensureLocaleNamespaces', () => {
  beforeEach(() => {
    addResourceBundleMock.mockReset();
    warnMock.mockReset();
    vi.restoreAllMocks();
  });

  it('returns a failed namespace list instead of undefined when the resource is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404 })) as typeof fetch
    );

    const result = await ensureLocaleNamespaces('en', ['app']);

    expect(result).toEqual({ loaded: [], failed: ['app'] });
    expect(warnMock).toHaveBeenCalled();
  });

  it('returns loaded namespaces when the payload is valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ dashboard: { title: 'Dashboard' } }), { status: 200 })
      ) as typeof fetch
    );

    const result = await ensureLocaleNamespaces('en', ['app']);

    expect(result).toEqual({ loaded: ['app'], failed: [] });
    expect(addResourceBundleMock).toHaveBeenCalledWith(
      'en',
      'translation',
      { dashboard: { title: 'Dashboard' } },
      true,
      true
    );
  });
});
