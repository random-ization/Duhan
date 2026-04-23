import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FlashcardView from '../../src/features/vocab/components/FlashcardView';
import type { ExtendedVocabularyItem, VocabSettings } from '../../src/features/vocab/types';

vi.mock('../../src/contexts/LayoutContext', () => ({
  useLayoutChromeState: () => ({ sidebarHidden: false }),
  useLayoutActions: () => ({ setSidebarHidden: vi.fn() }),
}));

vi.mock('../../src/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: vi.fn(async () => {}),
    stop: vi.fn(),
  }),
}));

const defaultWord: ExtendedVocabularyItem = {
  id: 'word-1',
  unit: 1,
  korean: '안녕하세요',
  english: 'hello',
  meaning: 'hello',
  exampleSentence: '안녕하세요.',
  exampleMeaning: 'Hello.',
};

const defaultSettings: VocabSettings = {
  flashcard: {
    batchSize: 20,
    random: false,
    cardFront: 'KOREAN',
    autoTTS: true,
    ratingMode: 'PASS_FAIL',
  },
  learn: {
    batchSize: 10,
    random: false,
    ratingMode: 'PASS_FAIL',
    types: {
      multipleChoice: true,
      writing: true,
    },
    answers: {
      korean: true,
      native: true,
    },
  },
};

describe('FlashcardView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('forwards updated flashcard preferences from the quick settings modal', () => {
    const onUpdateFlashcardSettings = vi.fn();

    render(
      <FlashcardView
        words={[defaultWord]}
        settings={defaultSettings}
        language="en"
        onComplete={vi.fn()}
        onUpdateFlashcardSettings={onUpdateFlashcardSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /4 buttons/i }));

    expect(onUpdateFlashcardSettings).toHaveBeenCalledWith({
      autoTTS: true,
      cardFront: 'KOREAN',
      ratingMode: 'FOUR_BUTTONS',
    });
  });
});
