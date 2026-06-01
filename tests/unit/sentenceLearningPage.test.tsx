import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { READING_PROGRESS, SENTENCE_EXPLAINER } from '../../src/utils/convexRefs';

const navigateMock = vi.fn();
const saveAssetsMock = vi.fn();
const removeSavedVocabularyAssetMock = vi.fn();
const updateReadingProgressMock = vi.fn();
const incrementSavedCountsMock = vi.fn();
const explainSentenceMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'zh' } }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ sentenceId: 'sentence_1' }),
  };
});

vi.mock('convex/react', () => ({
  useAction: () => explainSentenceMock,
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const { default: SentenceLearningPage } =
  await import('../../src/pages/learning/SentenceLearningPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <SentenceLearningPage />
    </MemoryRouter>
  );
}

describe('SentenceLearningPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    saveAssetsMock.mockReset();
    removeSavedVocabularyAssetMock.mockReset();
    updateReadingProgressMock.mockReset();
    incrementSavedCountsMock.mockReset();
    explainSentenceMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();

    saveAssetsMock.mockResolvedValue({
      success: true,
      source: 'content_import',
      sourceRefId: 'sentence_1',
      quality: {
        confidence: 0.91,
        promptVersion: 'v1',
        provider: 'test',
        reviewStatus: 'unreviewed',
        source: 'content_import',
        sourceRefId: 'sentence_1',
      },
      savedWordCount: 1,
      savedGrammarCount: 0,
      recentWords: [
        {
          id: 'word_1',
          word: '학교',
          meaning: '学校',
          reviewStatus: 'NEW',
          confidence: 0.91,
          promptVersion: 'v1',
          provider: 'test',
          source: 'content_import',
          sourceRefId: 'sentence_1',
        },
      ],
    });
    removeSavedVocabularyAssetMock.mockResolvedValue({ success: true, removed: true });
    updateReadingProgressMock.mockResolvedValue('progress_1');
    incrementSavedCountsMock.mockResolvedValue(undefined);
    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === SENTENCE_EXPLAINER.saveAssets) return saveAssetsMock;
      if (ref === SENTENCE_EXPLAINER.removeSavedVocabularyAsset) {
        return removeSavedVocabularyAssetMock;
      }
      if (ref === READING_PROGRESS.updateProgress) return updateReadingProgressMock;
      if (ref === READING_PROGRESS.incrementSavedCounts) return incrementSavedCountsMock;
      return vi.fn();
    });

    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (args === 'skip') return undefined;

      if ((args as { targetLanguage?: string }).targetLanguage === 'zh') {
        return {
          _id: 'explanation_1' as Id<'sentence_explanations'>,
          payload: {
            sentence: '저는 학교에 갑니다.',
            naturalTranslation: '我去学校。',
            overallMeaning: '描述去学校的动作。',
            vocabulary: [
              {
                surface: '저',
                lemma: '저',
                partOfSpeech: 'pronoun',
                meaning: '我',
              },
              {
                surface: '학교',
                lemma: '학교',
                partOfSpeech: 'noun',
                meaning: '学校',
              },
              {
                surface: '학교',
                lemma: '학교',
                partOfSpeech: 'noun',
                meaning: '学校',
              },
            ],
            grammar: [],
            notes: [],
          },
          confidence: 0.91,
          promptVersion: 'v1',
          reviewStatus: 'unreviewed',
          provider: 'test',
        };
      }

      if ((args as { sentenceId?: string }).sentenceId === 'sentence_1') {
        return {
          _id: 'sentence_1' as Id<'content_sentences'>,
          contentType: 'IMPORTED',
          contentRefId: 'content_1',
          sentenceIndex: 1,
          text: '저는 학교에 갑니다.',
          normalizedText: '저는 학교에 갑니다.',
          language: 'ko',
          textHash: 'hash_sentence_1',
          createdAt: 1710000000000,
        };
      }

      if ((args as { contentId?: string }).contentId === 'content_1') {
        return {
          _id: 'content_1' as Id<'imported_contents'>,
          title: '导入文章',
          rawText: '저는 학교에 갑니다. 내일 친구를 만납니다.',
          sourceType: 'USER_PASTE',
          sentenceCount: 2,
          savedSentenceIds: [],
          nextSentenceId: 'sentence_1' as Id<'content_sentences'>,
          createdAt: 1710000000000,
          sentences: [
            {
              _id: 'sentence_1' as Id<'content_sentences'>,
              contentType: 'IMPORTED',
              contentRefId: 'content_1',
              sentenceIndex: 1,
              text: '저는 학교에 갑니다.',
              normalizedText: '저는 학교에 갑니다.',
              language: 'ko',
              textHash: 'hash_sentence_1',
              createdAt: 1710000000000,
            },
            {
              _id: 'sentence_2' as Id<'content_sentences'>,
              contentType: 'IMPORTED',
              contentRefId: 'content_1',
              sentenceIndex: 2,
              text: '내일 친구를 만납니다.',
              normalizedText: '내일 친구를 만납니다.',
              language: 'ko',
              textHash: 'hash_sentence_2',
              createdAt: 1710000000000,
            },
          ],
        };
      }

      if ((args as { explanationId?: string }).explanationId === 'explanation_1') {
        return {
          hasSavedSentence: false,
          savedGrammarCount: 0,
          savedWordCount: 0,
          notePageId: null,
        };
      }

      return undefined;
    });
  });

  it('lets known words be excluded before generating vocabulary cards', async () => {
    renderPage();

    expect(await screen.findByText('词汇卡片生成')).toBeInTheDocument();
    expect(screen.getByText('将生成 2 张词卡')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '저 已认识' }));

    expect(screen.getByText('将生成 1 张词卡')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存到学习资产' }));

    await waitFor(() => {
      expect(saveAssetsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          explanationId: 'explanation_1',
          selectedWords: [
            {
              surface: '학교',
              lemma: '학교',
              partOfSpeech: 'noun',
              meaning: '学校',
            },
          ],
        })
      );
    });
  });

  it('merges duplicate vocabulary and saves edited card meanings', async () => {
    renderPage();

    expect(await screen.findByText('合并重复 1 项')).toBeInTheDocument();
    expect(screen.getByText('将生成 2 张词卡')).toBeInTheDocument();
    expect(screen.getByText('卡片预览')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('학교 词义'), {
      target: { value: '学校；校园' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저 已认识' }));
    fireEvent.click(screen.getByRole('button', { name: '保存到学习资产' }));

    await waitFor(() => {
      expect(saveAssetsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedWords: [
            {
              surface: '학교',
              lemma: '학교',
              partOfSpeech: 'noun',
              meaning: '学校；校园',
            },
          ],
        })
      );
    });
  });

  it('shows generated cards after saving and supports undoing a single card', async () => {
    renderPage();

    expect(await screen.findByText('词汇卡片生成')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저 已认识' }));
    fireEvent.click(screen.getByRole('button', { name: '保存到学习资产' }));

    expect(await screen.findByText('已生成卡片')).toBeInTheDocument();
    expect(screen.getByText('保存质量追踪')).toBeInTheDocument();
    expect(screen.getByText('本次保存 1 词卡 · 0 语法')).toBeInTheDocument();
    expect(screen.getByText('复习状态 NEW')).toBeInTheDocument();
    expect(screen.getAllByText('AI质量 91%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prompt v1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Source content_import').length).toBeGreaterThan(0);
    expect(screen.getByText('审核 unreviewed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '撤销 학교' }));

    await waitFor(() => {
      expect(removeSavedVocabularyAssetMock).toHaveBeenCalledWith({
        wordId: 'word_1',
        source: 'content_import',
        sourceRefId: 'sentence_1',
      });
    });
    expect(screen.queryByText('复习状态 NEW')).not.toBeInTheDocument();
  });

  it('syncs imported-content reading progress after saving and opens the next sentence', async () => {
    renderPage();

    expect(await screen.findByText('词汇卡片生成')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存到学习资产' }));

    await waitFor(() => {
      expect(updateReadingProgressMock).toHaveBeenCalledWith({
        contentType: 'imported_content',
        contentId: 'content_1',
        lastSentenceId: 'sentence_1',
        lastSentenceIndex: 1,
        completedSentenceCount: 1,
        totalSentenceCount: 2,
      });
    });
    expect(incrementSavedCountsMock).toHaveBeenCalledWith({
      contentType: 'imported_content',
      contentId: 'content_1',
      savedWordsDelta: 1,
      savedSentencesDelta: 1,
    });

    fireEvent.click(await screen.findByRole('button', { name: '学习下一句' }));

    expect(navigateMock).toHaveBeenCalledWith('/learning/sentence/sentence_2');
  });
});
