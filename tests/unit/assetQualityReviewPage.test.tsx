import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { SENTENCE_EXPLAINER } from '../../src/utils/convexRefs';

const navigateMock = vi.fn();
const reviewQualityItemMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('convex/react', () => ({
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
  useMutation: (ref: unknown) => useMutationMock(ref),
}));

const { default: AssetQualityReviewPage } =
  await import('../../src/pages/learning/AssetQualityReviewPage');

const qualityReviewStats = {
  totalQueued: 1,
  lowConfidenceQueued: 1,
  unreviewedQueued: 0,
  humanReviewed: 4,
  rejected: 1,
  byPromptProvider: [
    {
      promptVersion: 'v1',
      provider: 'test',
      queued: 1,
      reviewed: 4,
      rejected: 1,
      averageConfidence: 0.61,
    },
  ],
};

describe('AssetQualityReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewQualityItemMock.mockResolvedValue({
      success: true,
      explanationId: 'explanation_1',
      reviewStatus: 'human_reviewed',
    });
    useMutationMock.mockReturnValue(reviewQualityItemMock);
    useQueryMock.mockImplementation((ref: unknown) => {
      if (ref === SENTENCE_EXPLAINER.getQualityReviewQueue) {
        return [
          {
            explanationId: 'explanation_1' as Id<'sentence_explanations'>,
            sentenceId: 'sentence_1' as Id<'content_sentences'>,
            sentence: '저는 학교에 갑니다.',
            naturalTranslation: '我去学校。',
            summary: '去学校的陈述句。',
            confidence: 0.61,
            promptVersion: 'v1',
            provider: 'test',
            model: 'test-model',
            source: 'content_import',
            sourceRefId: 'sentence_1',
            reviewStatus: 'unreviewed',
            reason: 'low_confidence',
            createdAt: 1710000000000,
          },
        ];
      }
      if (ref === SENTENCE_EXPLAINER.getQualityReviewStats) {
        return qualityReviewStats;
      }
      return undefined;
    });
  });

  it('renders low-confidence sentence explanations and approves an item', async () => {
    render(<AssetQualityReviewPage />);

    expect(await screen.findByText('AI Asset Quality Review')).toBeInTheDocument();
    expect(screen.getByText('Low confidence')).toBeInTheDocument();
    expect(screen.getByText('저는 학교에 갑니다.')).toBeInTheDocument();
    expect(screen.getByText('AI quality 61%')).toBeInTheDocument();
    expect(screen.getByText('Prompt v1')).toBeInTheDocument();
    expect(screen.getByText('Source content_import')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }));

    await waitFor(() => {
      expect(reviewQualityItemMock).toHaveBeenCalledWith({
        explanationId: 'explanation_1',
        decision: 'human_reviewed',
      });
    });
  });

  it('submits inline corrections and reviewer note when approving an item', async () => {
    render(<AssetQualityReviewPage />);

    fireEvent.change(await screen.findByLabelText('Natural translation correction'), {
      target: { value: '我正在去学校。' },
    });
    fireEvent.change(screen.getByLabelText('Summary correction'), {
      target: { value: '说明去学校这个动作。' },
    });
    fireEvent.change(screen.getByLabelText('Review note'), {
      target: { value: '修正中文语气。' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }));

    await waitFor(() => {
      expect(reviewQualityItemMock).toHaveBeenCalledWith({
        explanationId: 'explanation_1',
        decision: 'human_reviewed',
        corrections: {
          naturalTranslation: '我正在去学校。',
          summary: '说明去学校这个动作。',
        },
        reviewNote: '修正中文语气。',
      });
    });
  });

  it('rejects an item without using loose mutation payloads', async () => {
    render(<AssetQualityReviewPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Reject/ }));

    await waitFor(() => {
      expect(reviewQualityItemMock).toHaveBeenCalledWith({
        explanationId: 'explanation_1',
        decision: 'rejected',
      });
    });
  });

  it('bulk-approves the current review queue', async () => {
    render(<AssetQualityReviewPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Approve current list/ }));

    await waitFor(() => {
      expect(reviewQualityItemMock).toHaveBeenCalledWith({
        explanationIds: ['explanation_1'],
        decision: 'human_reviewed',
        reviewNote: 'batch_review',
      });
    });
  });

  it('filters the queue by low-confidence review reason', async () => {
    render(<AssetQualityReviewPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Low confidence first/ }));

    await waitFor(() => {
      expect(useQueryMock).toHaveBeenCalledWith(SENTENCE_EXPLAINER.getQualityReviewQueue, {
        limit: 30,
        maxConfidence: 0.82,
        reason: 'low_confidence',
      });
    });
    expect(screen.getByText('Prompt v1 / test')).toBeInTheDocument();
  });

  it('shows prompt and provider quality workload stats', async () => {
    render(<AssetQualityReviewPage />);

    expect(await screen.findByText('Quality workload')).toBeInTheDocument();
    expect(screen.getByText('Total queued 1')).toBeInTheDocument();
    expect(screen.getByText('Approved 4 / Rejected 1')).toBeInTheDocument();
    expect(screen.getByText('v1 / test')).toBeInTheDocument();
    expect(
      screen.getByText('Queued 1 · Approved 4 · Rejected 1 · Avg quality 61%')
    ).toBeInTheDocument();
  });
});
