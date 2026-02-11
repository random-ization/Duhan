import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUserCountry } from '../../src/utils/geo';

describe('geo utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchUserCountry', () => {
    it('should return country code on successful API call', async () => {
      const mockResponse = { success: true, country_code: 'CN' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchUserCountry();
      expect(result).toBe('CN');
      expect(fetch).toHaveBeenCalledWith(
        'https://ipwho.is/?fields=success,country_code',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should return null when API returns no country_code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchUserCountry();
      expect(result).toBeNull();
    });

    it('should return null when API call fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await fetchUserCountry();
      expect(result).toBeNull();
    });

    it('should return null when network error occurs', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchUserCountry();
      expect(result).toBeNull();
    });

    it('should handle various country codes', async () => {
      const countryCodes = ['US', 'KR', 'JP', 'VN', 'MN'];

      for (const code of countryCodes) {
        localStorage.clear();
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true, country_code: code }),
        });

        const result = await fetchUserCountry();
        expect(result).toBe(code);
      }
    });
  });
});
