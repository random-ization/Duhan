import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOTATIONS, NOTE_PAGES } from '../../src/utils/convexRefs';
import { useScopedAnnotations } from '../../src/features/annotation-kit/hooks/useScopedAnnotations';

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const pickNotebookMock = vi.fn();

const upsertByAnchorMock = vi.fn();
const deleteByIdMock = vi.fn();
const updateNoteMock = vi.fn();
const ingestFromSourceMock = vi.fn();
const deleteBySourceRefMock = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
  useMutation: (ref: unknown) => useMutationMock(ref),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

vi.mock('../../src/contexts/NotebookPickerContext', () => ({
  useNotebookPicker: () => ({
    pickNotebook: pickNotebookMock,
  }),
}));

describe('useScopedAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    upsertByAnchorMock.mockResolvedValue({ id: 'ann-1', success: true, upserted: false });
    deleteByIdMock.mockResolvedValue({ success: true });
    updateNoteMock.mockResolvedValue({ success: true });
    ingestFromSourceMock.mockResolvedValue({
      success: true,
      pageId: 'page-1',
      created: true,
      dedupeKey: 'k',
      sourceRef: {},
      hasNote: true,
      hasHighlight: true,
    });
    deleteBySourceRefMock.mockResolvedValue({ success: true });
    pickNotebookMock.mockResolvedValue('notebook-1');

    useQueryMock.mockReturnValue([]);

    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === ANNOTATIONS.upsertByAnchor) return upsertByAnchorMock;
      if (ref === ANNOTATIONS.deleteById) return deleteByIdMock;
      if (ref === ANNOTATIONS.updateNote) return updateNoteMock;
      if (ref === NOTE_PAGES.ingestFromSource) return ingestFromSourceMock;
      if (ref === NOTE_PAGES.deleteBySourceRef) return deleteBySourceRefMock;
      return vi.fn();
    });
  });

  it('writes annotation and upserts note page when note exists', async () => {
    const { result } = renderHook(() =>
      useScopedAnnotations({
        scopeType: 'READING_ARTICLE',
        scopeId: 'article-1',
        sourceModule: 'READING_ARTICLE',
        contentTitle: 'Article title',
        extraTags: ['reading', 'news'],
      })
    );

    await act(async () => {
      await result.current.upsert({
        anchor: {
          blockId: 'P0',
          start: 10,
          end: 16,
          quote: 'sample text',
          contextBefore: 'before text',
          contextAfter: 'after text',
        },
        note: 'my note',
        color: 'yellow',
        contextKey: 'READING:article-1:P0',
      });
    });

    expect(upsertByAnchorMock).toHaveBeenCalledWith({
      scopeType: 'READING_ARTICLE',
      scopeId: 'article-1',
      blockId: 'P0',
      start: 10,
      end: 16,
      quote: 'sample text',
      contextBefore: 'before text',
      contextAfter: 'after text',
      note: 'my note',
      color: 'yellow',
      contextKey: 'READING:article-1:P0',
      targetType: 'TEXTBOOK',
    });

    expect(ingestFromSourceMock).toHaveBeenCalledWith({
      notebookId: 'notebook-1',
      sourceModule: 'READING_ARTICLE',
      sourceRef: {
        module: 'READING_ARTICLE',
        scopeType: 'READING_ARTICLE',
        scopeId: 'article-1',
        blockId: 'P0',
        start: 10,
        end: 16,
        quote: 'sample text',
        contextKey: 'READING:article-1:P0',
        annotationId: 'ann-1',
      },
      noteType: 'manual',
      title: 'Article title',
      quote: 'sample text',
      note: 'my note',
      color: 'yellow',
      tags: ['annotation', 'reading', 'news'],
      status: 'Inbox',
      scopeType: 'READING_ARTICLE',
      scopeId: 'article-1',
      blockId: 'P0',
      start: 10,
      end: 16,
      contextBefore: 'before text',
      contextAfter: 'after text',
      contextKey: 'READING:article-1:P0',
      contentId: 'article-1',
      contentTitle: 'Article title',
      annotationId: 'ann-1',
    });
    expect(pickNotebookMock).toHaveBeenCalledTimes(1);
    expect(pickNotebookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
        confirmText: expect.any(String),
        cancelText: expect.any(String),
      })
    );
  });

  it('still syncs notebook asset for highlight-only annotations', async () => {
    const { result } = renderHook(() =>
      useScopedAnnotations({
        scopeType: 'READING_ARTICLE',
        scopeId: 'article-1',
      })
    );

    await act(async () => {
      await result.current.upsert({
        anchor: {
          blockId: 'P0',
          start: 1,
          end: 2,
          quote: '가',
          contextBefore: '',
          contextAfter: '',
        },
        note: '   ',
        color: 'green',
      });
    });

    expect(upsertByAnchorMock).toHaveBeenCalledTimes(1);
    expect(ingestFromSourceMock).not.toHaveBeenCalled();
    expect(deleteBySourceRefMock).not.toHaveBeenCalled();
    expect(pickNotebookMock).not.toHaveBeenCalled();
  });
});
