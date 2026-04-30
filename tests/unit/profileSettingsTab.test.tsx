import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSettingsTab } from '../../src/pages/profile/tabs/ProfileSettingsTab';

const useGlobalSettingsMock = vi.fn();

vi.mock('../../src/hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => useGlobalSettingsMock(),
}));

describe('ProfileSettingsTab', () => {
  beforeEach(() => {
    useGlobalSettingsMock.mockReset();
  });

  it.skip('updates the cloud display language when a new language is selected', () => {
    const updateSettingsMock = vi.fn();
    useGlobalSettingsMock.mockReturnValue({
      settings: {
        displayLanguage: 'en',
        flashcardAutoTTS: true,
        flashcardFront: 'KOREAN',
        flashcardRatingMode: 'PASS_FAIL',
        listenPlayMeaning: true,
        listenPlayExampleTranslation: true,
        audioRepeatCount: 2,
        audioSpeed: 1,
        dictationPlayCount: 2,
        dictationGapSeconds: 2,
        dictationAutoNext: true,
      },
      updateSettings: updateSettingsMock,
      isLoading: false,
    });

    render(<ProfileSettingsTab labels={{}} />);

    fireEvent.click(screen.getByRole('button', { name: /中文/i }));

    expect(updateSettingsMock).toHaveBeenCalledWith({ displayLanguage: 'zh' });
  });

  it.skip('updates dictation settings from the profile center', () => {
    const updateSettingsMock = vi.fn();
    useGlobalSettingsMock.mockReturnValue({
      settings: {
        displayLanguage: 'en',
        flashcardAutoTTS: true,
        flashcardFront: 'KOREAN',
        flashcardRatingMode: 'PASS_FAIL',
        listenPlayMeaning: true,
        listenPlayExampleTranslation: true,
        audioRepeatCount: 2,
        audioSpeed: 1,
        dictationPlayCount: 2,
        dictationGapSeconds: 2,
        dictationAutoNext: true,
      },
      updateSettings: updateSettingsMock,
      isLoading: false,
    });

    render(<ProfileSettingsTab labels={{}} />);

    fireEvent.click(screen.getAllByRole('button', { name: '3x' })[1]);
    fireEvent.click(screen.getByRole('button', { name: '6s' }));

    expect(updateSettingsMock).toHaveBeenCalledWith({ dictationPlayCount: 3 });
    expect(updateSettingsMock).toHaveBeenCalledWith({ dictationGapSeconds: 6 });
  });
});
