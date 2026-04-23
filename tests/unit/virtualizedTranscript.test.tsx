import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VirtualizedTranscript from '../../src/components/podcast/VirtualizedTranscript';

const scrollToIndexMock = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, start: index * 96 })),
    getTotalSize: () => count * 96,
    scrollToIndex: scrollToIndexMock,
  }),
}));

describe('VirtualizedTranscript', () => {
  it('keeps the analyze action and empty translation placeholder in the virtualized row', () => {
    const onAnalyze = vi.fn();
    const transcript = [
      {
        start: 5,
        end: 9,
        text: '안녕하세요',
        translation: '',
        words: [{ word: '안녕하세요', start: 5, end: 9 }],
      },
    ] as const;

    render(
      <VirtualizedTranscript
        transcript={transcript}
        activeLineIndex={0}
        currentTime={6}
        showTranslation
        noTranslationText="No translation yet"
        analyzeLabel="Analyze this sentence"
        onSeek={vi.fn()}
        onAnalyze={onAnalyze}
      />
    );

    expect(screen.getByText('No translation yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /analyze this sentence/i }));

    expect(onAnalyze).toHaveBeenCalledWith(transcript[0]);
    expect(scrollToIndexMock).toHaveBeenCalledWith(0, {
      align: 'auto',
      behavior: 'smooth',
    });
  });
});
