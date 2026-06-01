import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { IMPORTED_CONTENT, READING_PROGRESS } from '../../src/utils/convexRefs';

const navigateMock = vi.fn();
const notifyInfoMock = vi.fn();
const notifySuccessMock = vi.fn();
const notifyErrorMock = vi.fn();
const importTextMutationMock = vi.fn();
const updateReadingProgressMock = vi.fn();
const markReadingCompletedMock = vi.fn();
const updateContentTagsMock = vi.fn();
const updateContentFolderMock = vi.fn();
const importFromUrlActionMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    info: (message: string) => notifyInfoMock(message),
    success: (message: string) => notifySuccessMock(message),
    error: (message: string) => notifyErrorMock(message),
  },
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useAction: () => importFromUrlActionMock,
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const { default: TextImportPage } = await import('../../src/pages/learning/TextImportPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <TextImportPage />
    </MemoryRouter>
  );
}

describe('TextImportPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    notifyInfoMock.mockReset();
    notifySuccessMock.mockReset();
    notifyErrorMock.mockReset();
    importTextMutationMock.mockReset();
    updateReadingProgressMock.mockReset();
    markReadingCompletedMock.mockReset();
    updateContentTagsMock.mockReset();
    updateContentFolderMock.mockReset();
    importFromUrlActionMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();

    importTextMutationMock.mockResolvedValue('content_text_1' as Id<'imported_contents'>);
    updateReadingProgressMock.mockResolvedValue('progress_1');
    markReadingCompletedMock.mockResolvedValue('progress_1');
    updateContentTagsMock.mockResolvedValue(['新闻', '精读']);
    updateContentFolderMock.mockResolvedValue('新闻精读');
    importFromUrlActionMock.mockResolvedValue({
      success: true,
      contentId: 'content_url_1' as Id<'imported_contents'>,
    });
    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === IMPORTED_CONTENT.importTextContent) return importTextMutationMock;
      if (ref === IMPORTED_CONTENT.updateContentTags) return updateContentTagsMock;
      if (ref === IMPORTED_CONTENT.updateContentFolder) return updateContentFolderMock;
      if (ref === READING_PROGRESS.updateProgress) return updateReadingProgressMock;
      if (ref === READING_PROGRESS.markCompleted) return markReadingCompletedMock;
      return vi.fn();
    });

    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (args === 'skip') {
        return undefined;
      }

      const queryLimit = (args as { limit?: number }).limit;
      if (queryLimit === 3 || queryLimit === 12) {
        return [
          {
            contentId: 'content_recent_1',
            title: '最近导入文章',
            sourceType: 'USER_PASTE',
            sentenceCount: 3,
            savedSentenceCount: 1,
            savedWordCount: 4,
            savedGrammarCount: 2,
            completedSentenceCount: 1,
            remainingSentenceCount: 2,
            dailySentenceTarget: 2,
            estimatedStudyDays: 1,
            tags: ['新闻'],
            folderName: '新闻精读',
            readingTimeSeconds: 60,
            nextSentenceId: 'sentence_next_1',
            nextSentenceText: '다음 문장을 계속 공부합니다.',
            progressPercent: 33,
            createdAt: 1710000000000,
          },
          {
            contentId: 'content_recent_done',
            title: '已完成导入文章',
            sourceType: 'URL',
            sourceUrl: 'https://example.com/korean-article',
            sourceHost: 'example.com',
            sentenceCount: 2,
            savedSentenceCount: 2,
            savedWordCount: 5,
            savedGrammarCount: 1,
            completedSentenceCount: 2,
            remainingSentenceCount: 0,
            dailySentenceTarget: 0,
            estimatedStudyDays: 0,
            tags: ['已读'],
            folderName: 'URL 文章',
            readingTimeSeconds: 180,
            readingCompletedAt: 1710000100000,
            progressPercent: 100,
            createdAt: 1710000100000,
          },
        ];
      }

      if ((args as { contentType?: string }).contentType === 'imported_content') {
        return {
          contentType: 'imported_content',
          contentId: 'content_url_1',
          lastSentenceId: 'sentence_1',
          lastSentenceIndex: 1,
          completedSentenceCount: 1,
          totalSentenceCount: 2,
          readingTimeSeconds: 180,
          completedAt: undefined,
          updatedAt: 1710000000000,
        };
      }

      const contentId = (args as { contentId?: string }).contentId;
      if (contentId === 'content_url_1' || contentId === 'content_recent_1') {
        return {
          _id: contentId,
          title: contentId === 'content_recent_1' ? '最近导入文章' : 'URL 导入文章',
          rawText: '한국어 기사입니다. 다음 문장을 이어서 읽습니다.',
          sourceType: 'URL',
          summaryZh: '摘要',
          difficultyLevel: 'TOPIK 3',
          estimatedMinutes: 3,
          wordCount: 12,
          sentenceCount: 2,
          savedSentenceIds: [],
          nextSentenceId: 'sentence_1',
          sentences: [
            {
              _id: 'sentence_1',
              sentenceIndex: 1,
              text: '한국어 기사입니다.',
            },
            {
              _id: 'sentence_2',
              sentenceIndex: 2,
              text: '다음 문장을 이어서 읽습니다.',
            },
          ],
        };
      }

      return undefined;
    });
  });

  it('uses the URL import action when URL mode is selected', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'URL 导入' }));

    fireEvent.change(screen.getByLabelText('内容标题'), {
      target: { value: '新闻摘录' },
    });
    fireEvent.change(screen.getByLabelText('文章来源 URL'), {
      target: { value: 'https://example.com/korean-article' },
    });

    fireEvent.click(screen.getByRole('button', { name: '导入链接并开始学习' }));

    await waitFor(() => {
      expect(importFromUrlActionMock).toHaveBeenCalledWith({
        customTitle: '新闻摘录',
        url: 'https://example.com/korean-article',
      });
    });

    expect(importTextMutationMock).not.toHaveBeenCalled();
    expect(await screen.findByText('URL 导入文章')).toBeInTheDocument();
  });

  it('opens the registered sentence learning route from an imported sentence', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'URL 导入' }));
    fireEvent.change(screen.getByLabelText('文章来源 URL'), {
      target: { value: 'https://example.com/korean-article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '导入链接并开始学习' }));

    fireEvent.click(await screen.findByText('한국어 기사입니다.'));

    await waitFor(() => {
      expect(updateReadingProgressMock).toHaveBeenCalledWith({
        contentType: 'imported_content',
        contentId: 'content_url_1',
        lastSentenceId: 'sentence_1',
        lastSentenceIndex: 1,
        completedSentenceCount: 1,
        totalSentenceCount: 2,
      });
    });
    expect(navigateMock).toHaveBeenCalledWith('/learning/sentence/sentence_1');
  });

  it('offers a continuation card for recently imported content', async () => {
    renderPage();

    expect(await screen.findByText('继续导入内容')).toBeInTheDocument();
    expect(screen.getAllByText('最近导入文章').length).toBeGreaterThan(0);
    expect(screen.getByText('已保存 1 句 / 4 词 / 2 语法')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '继续下一句' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/learning/sentence/sentence_next_1');
  });

  it('opens a recent imported content workspace from the library', async () => {
    renderPage();

    expect(await screen.findByText('导入内容库')).toBeInTheDocument();
    expect(screen.getByText('已完成导入文章')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '打开学习台' })[0]);

    expect(await screen.findByText('阅读进度')).toBeInTheDocument();
    expect(screen.getByText('最近导入文章')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '未完成' })).toBeInTheDocument();
  });

  it('summarizes the imported-content library and filters by source type', async () => {
    renderPage();

    expect(await screen.findByText('2 篇内容')).toBeInTheDocument();
    expect(screen.getByText('1 篇进行中')).toBeInTheDocument();
    expect(screen.getByText('1 篇已完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'URL 来源' }));

    expect(screen.getByText('已完成导入文章')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.queryByText('最近导入文章')).not.toBeInTheDocument();
  });

  it('shows a multi-day study plan for imported content', async () => {
    renderPage();

    expect(await screen.findByText('剩余 2 句')).toBeInTheDocument();
    expect(screen.getByText('每天 2 句')).toBeInTheDocument();
    expect(screen.getByText('预计 1 天完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'URL 来源' }));

    expect(screen.getByText('已完成全文')).toBeInTheDocument();
  });

  it('shows a seven-day reading plan across imported content', async () => {
    renderPage();

    const planTitle = await screen.findByText('7 天阅读计划');
    const planPanel = planTitle.closest('section');
    if (!(planPanel instanceof HTMLElement)) {
      throw new Error('Seven-day reading plan panel was not rendered');
    }
    const planView = within(planPanel);

    expect(planView.getByText('未完成 1 篇')).toBeInTheDocument();
    expect(planView.getByText('还剩 2 句')).toBeInTheDocument();
    expect(planView.getByText('每日 2 句')).toBeInTheDocument();
    expect(planView.getByText('预计 1 天清空')).toBeInTheDocument();
    expect(planView.getByText('本周可完成 1 篇')).toBeInTheDocument();
  });

  it('filters imported content by tag and persists tag edits', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: '标签：新闻' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '标签：已读' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '标签：新闻' }));

    expect(screen.getAllByText('最近导入文章').length).toBeGreaterThan(0);
    expect(screen.queryByText('已完成导入文章')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('最近导入文章 标签'), {
      target: { value: '新闻, 精读' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存 最近导入文章 标签' }));

    await waitFor(() => {
      expect(updateContentTagsMock).toHaveBeenCalledWith({
        contentId: 'content_recent_1',
        tags: ['新闻', '精读'],
      });
    });
    expect(notifySuccessMock).toHaveBeenCalledWith('标签已保存');
  });

  it('filters imported content by folder and persists folder edits', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: '文件夹：新闻精读' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '文件夹：URL 文章' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '文件夹：URL 文章' }));

    expect(screen.getByText('已完成导入文章')).toBeInTheDocument();
    expect(screen.queryByLabelText('最近导入文章 文件夹')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('已完成导入文章 文件夹'), {
      target: { value: '新闻复盘' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存 已完成导入文章 文件夹' }));

    await waitFor(() => {
      expect(updateContentFolderMock).toHaveBeenCalledWith({
        contentId: 'content_recent_done',
        folderName: '新闻复盘',
      });
    });
    expect(notifySuccessMock).toHaveBeenCalledWith('文件夹已保存');
  });

  it('shows completed content outcome summary in the library', async () => {
    renderPage();

    await screen.findByText('已完成导入文章');

    fireEvent.click(screen.getByRole('button', { name: 'URL 来源' }));

    const filteredCompletedTitle = screen.getByText('已完成导入文章');
    const completedCardElement = filteredCompletedTitle.closest('.rounded-2xl');
    if (!(completedCardElement instanceof HTMLElement)) {
      throw new Error('Completed content card was not rendered');
    }
    const completedCardView = within(completedCardElement);
    expect(completedCardView.getByText('完成产出')).toBeInTheDocument();
    expect(completedCardView.getByText('2 句子')).toBeInTheDocument();
    expect(completedCardView.getByText('5 词卡')).toBeInTheDocument();
    expect(completedCardView.getByText('1 语法')).toBeInTheDocument();
    expect(completedCardView.getByText('阅读 3 分钟')).toBeInTheDocument();
  });

  it('shows cross-content outcome trends for the imported library', async () => {
    renderPage();

    const outcomeTitle = await screen.findByText('累计产出');
    const outcomePanel = outcomeTitle.closest('section');
    if (!(outcomePanel instanceof HTMLElement)) {
      throw new Error('Cumulative outcome panel was not rendered');
    }
    const outcomeView = within(outcomePanel);

    expect(outcomeView.getByText('3 句子')).toBeInTheDocument();
    expect(outcomeView.getByText('9 词卡')).toBeInTheDocument();
    expect(outcomeView.getByText('3 语法')).toBeInTheDocument();
    expect(outcomeView.getByText('阅读 4 分钟')).toBeInTheDocument();
  });

  it('shows a thirty-day outcome trend summary for imported content', async () => {
    renderPage();

    const trendTitle = await screen.findByText('30 天成果趋势');
    const trendPanel = trendTitle.closest('section');
    if (!(trendPanel instanceof HTMLElement)) {
      throw new Error('Thirty-day outcome trend panel was not rendered');
    }
    const trendView = within(trendPanel);

    expect(trendView.getByText('完成 1/2 篇')).toBeInTheDocument();
    expect(trendView.getByText('完成率 50%')).toBeInTheDocument();
    expect(trendView.getByText('阅读 4 分钟')).toBeInTheDocument();
    expect(trendView.getByText('沉淀 15 项资产')).toBeInTheDocument();
  });

  it('shows sentence queue filters and resume action in import result view', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'URL 导入' }));
    fireEvent.change(screen.getByLabelText('文章来源 URL'), {
      target: { value: 'https://example.com/korean-article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '导入链接并开始学习' }));

    expect(await screen.findByRole('button', { name: '回到上次进度' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '未完成' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已完成' })).toBeInTheDocument();
  });

  it('shows reading progress and marks imported content completed', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'URL 导入' }));
    fireEvent.change(screen.getByLabelText('文章来源 URL'), {
      target: { value: 'https://example.com/korean-article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '导入链接并开始学习' }));

    expect(await screen.findByText('阅读进度')).toBeInTheDocument();
    expect(screen.getByText('1/2 句')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '标记全文完成' }));

    await waitFor(() => {
      expect(markReadingCompletedMock).toHaveBeenCalledWith({
        contentType: 'imported_content',
        contentId: 'content_url_1',
      });
    });
    expect(notifySuccessMock).toHaveBeenCalledWith('已标记为完成');
  });

  it('resumes from reading progress when saved state has not caught up', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'URL 导入' }));
    fireEvent.change(screen.getByLabelText('文章来源 URL'), {
      target: { value: 'https://example.com/korean-article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '导入链接并开始学习' }));

    fireEvent.click(await screen.findByRole('button', { name: '回到上次进度' }));

    expect(navigateMock).toHaveBeenCalledWith('/learning/sentence/sentence_2');
  });
});
