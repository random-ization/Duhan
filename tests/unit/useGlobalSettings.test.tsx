import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlobalSettings } from '../../src/hooks/useGlobalSettings';
import { USER_SETTINGS } from '../../src/utils/convexRefs';
import { DEFAULT_GLOBAL_USER_SETTINGS } from '../../src/types/globalUserSettings';

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const updateSettingsMutationMock = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

describe('useGlobalSettings', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    updateSettingsMutationMock.mockReset();
    useMutationMock.mockReturnValue(updateSettingsMutationMock);
  });

  it('merges defaults with stored Convex settings', () => {
    useQueryMock.mockImplementation((ref: unknown) => {
      if (ref === USER_SETTINGS.getSettings) {
        return {
          ...DEFAULT_GLOBAL_USER_SETTINGS,
          flashcardAutoTTS: false,
          audioSpeed: 1.2,
        };
      }
      if (ref === USER_SETTINGS.getStoredSettings) {
        return { flashcardAutoTTS: false, audioSpeed: 1.2 };
      }
      return undefined;
    });

    const { result } = renderHook(() => useGlobalSettings());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings.flashcardAutoTTS).toBe(false);
    expect(result.current.settings.audioSpeed).toBe(1.2);
    expect(result.current.settings.dictationPlayCount).toBe(
      DEFAULT_GLOBAL_USER_SETTINGS.dictationPlayCount
    );
    expect(result.current.storedSettings).toEqual({ flashcardAutoTTS: false, audioSpeed: 1.2 });
  });

  it('returns loading while settings query is unresolved', () => {
    useQueryMock.mockImplementation((ref: unknown) => {
      if (ref === USER_SETTINGS.getSettings) return undefined;
      if (ref === USER_SETTINGS.getStoredSettings) return undefined;
      return undefined;
    });

    const { result } = renderHook(() => useGlobalSettings());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toEqual(DEFAULT_GLOBAL_USER_SETTINGS);
  });

  it('forwards partial updates to the mutation', async () => {
    useQueryMock.mockImplementation((ref: unknown) => {
      if (ref === USER_SETTINGS.getSettings) return DEFAULT_GLOBAL_USER_SETTINGS;
      if (ref === USER_SETTINGS.getStoredSettings) return {};
      return undefined;
    });

    const { result } = renderHook(() => useGlobalSettings());

    await act(async () => {
      await result.current.updateSettings({
        flashcardFront: 'NATIVE',
        dictationAutoNext: false,
      });
    });

    expect(updateSettingsMutationMock).toHaveBeenCalledWith({
      flashcardFront: 'NATIVE',
      dictationAutoNext: false,
    });
  });
});
