import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTE_PAGES } from '../../src/utils/convexRefs';
import { LayoutProvider } from '../../src/contexts/LayoutContext';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

const pageId = 'page-1' as any;

const createPageMock = vi.fn(async () => ({ success: true, id: pageId }));
const updatePageMock = vi.fn(async () => ({ success: true }));
const saveBlocksMock = vi.fn(async () => ({ success: true, count: 1, mode: 'patch' }));
const saveEditorDocMock = vi.fn(async () => ({ success: true }));
const applyTemplateMock = vi.fn(async () => ({ success: true, count: 1 }));
const createTemplateMock = vi.fn(async () => ({ success: true, id: 'template-1' as any }));
const togglePinMock = vi.fn(async () => ({ success: true }));
const archivePageMock = vi.fn(async () => ({ success: true }));
const markReviewedMock = vi.fn(async () => ({ success: true, reviewedAt: Date.now() }));
const enqueueReviewMock = vi.fn(async () => ({ success: true, scheduledFor: Date.now() }));
const createLinkMock = vi.fn(async () => ({ success: true, duplicated: false }));
const migrateLegacyMock = vi.fn(async () => ({ success: true, alreadyMigrated: true }));

const searchCallHistory: Array<{ ref: unknown; args: unknown }> = [];

vi.mock('convex/react', () => ({
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
  useMutation: (ref: unknown) => useMutationMock(ref),
}));

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: {
      resolvedLanguage: 'en',
      language: 'en',
    },
  }),
}));

vi.mock('../../src/components/notebook/OfficialTiptapEditor', () => ({
  default: ({ onChange }: { onChange: (doc: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'updated' }] }],
        })
      }
    >
      Mock Editor
    </button>
  ),
}));

const { default: NotebookV2Page } = await import('../../src/pages/NotebookV2Page');

const getLatestSearchArgs = () => {
  for (let i = searchCallHistory.length - 1; i >= 0; i -= 1) {
    const row = searchCallHistory[i];
    if (row?.ref === NOTE_PAGES.search) {
      return row.args as Record<string, unknown>;
    }
  }
  return null;
};

describe('NotebookV2Page', () => {
  const renderWithLayout = () =>
    render(
      <LayoutProvider>
        <NotebookV2Page />
      </LayoutProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    searchCallHistory.length = 0;

    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === NOTE_PAGES.createPage) return createPageMock;
      if (ref === NOTE_PAGES.updatePage) return updatePageMock;
      if (ref === NOTE_PAGES.saveBlocks) return saveBlocksMock;
      if (ref === NOTE_PAGES.saveEditorDoc) return saveEditorDocMock;
      if (ref === NOTE_PAGES.applyTemplate) return applyTemplateMock;
      if (ref === NOTE_PAGES.createTemplate) return createTemplateMock;
      if (ref === NOTE_PAGES.togglePin) return togglePinMock;
      if (ref === NOTE_PAGES.archivePage) return archivePageMock;
      if (ref === NOTE_PAGES.markReviewed) return markReviewedMock;
      if (ref === NOTE_PAGES.enqueueReview) return enqueueReviewMock;
      if (ref === NOTE_PAGES.createLink) return createLinkMock;
      if (ref === NOTE_PAGES.migrateLegacyAllNotes) return migrateLegacyMock;
      if (ref === NOTE_PAGES.migrateNotesIntoSourceNotebooks) return migrateLegacyMock;
      return vi.fn();
    });

    useQueryMock.mockImplementation((ref: unknown, args: unknown) => {
      searchCallHistory.push({ ref, args });

      if (ref === NOTE_PAGES.listPages) {
        return [
          {
            id: pageId,
            title: 'Reading Note 1',
            icon: '📝',
            tags: ['reading'],
            isArchived: false,
            isTemplate: false,
            sortOrder: 0,
            status: 'Collections',
            pinned: false,
            metadata: { status: 'Collections', pinned: false },
            updatedAt: 1710000000000,
            createdAt: 1710000000000,
          },
        ];
      }

      if (ref === NOTE_PAGES.getPage) {
        if (args === 'skip') return undefined;
        return {
          page: {
            id: pageId,
            title: 'Reading Note 1',
            icon: '📝',
            tags: ['reading'],
            metadata: { status: 'Inbox', pinned: false },
            status: 'Inbox',
            pinned: false,
            noteKind: 'quote_card',
            quoteText: 'Sample quote',
            noteText: 'Sample note content',
          },
          editorDoc: undefined,
          blocks: [
            {
              id: 'block-quote',
              blockKey: 'quote',
              blockType: 'quote',
              content: { text: 'Sample quote', color: 'yellow' },
              sortOrder: 0,
            },
            {
              id: 'block-note',
              blockKey: 'note',
              blockType: 'paragraph',
              content: { text: 'Sample note content' },
              sortOrder: 1,
            },
          ],
          backlinks: [],
          outgoingLinks: [],
          children: [],
        };
      }

      if (ref === NOTE_PAGES.listTemplates) {
        return [];
      }

      if (ref === NOTE_PAGES.search) {
        return {
          items: [
            {
              id: pageId,
              title: 'Reading Note 1',
              icon: '📝',
              tags: ['reading'],
              status: 'Inbox',
              pinned: false,
              sourceModule: 'READING_ARTICLE',
              noteKind: 'quote_card',
              quoteText: 'Sample quote',
              noteText: 'Sample note content',
              sourceRef: {
                module: 'READING_ARTICLE',
                contentId: 'article-1',
              },
              updatedAt: 1710000000000,
              createdAt: 1710000000000,
              snippet: 'Snippet from reading article',
            },
          ],
          nextCursor: null,
        };
      }

      if (ref === NOTE_PAGES.listFacets) {
        return {
          total: 1,
          todayAdded: 1,
          withNote: 1,
          withHighlight: 1,
          sources: [{ key: 'READING_ARTICLE', count: 1, unreviewed: 1, todayAdded: 1 }],
          noteTypes: [{ key: 'manual', count: 1 }],
          statuses: [{ key: 'Inbox', count: 1 }],
        };
      }

      if (ref === NOTE_PAGES.listReviewQueue) {
        return [
          {
            id: 'rq1',
            status: 'queued',
            scheduledFor: 1710000000000,
            updatedAt: 1710000000000,
            sourceRef: { module: 'READING_ARTICLE', contentId: 'article-1' },
            page: {
              id: pageId,
              title: 'Reading Note 1',
              icon: '📝',
              tags: ['reading'],
              updatedAt: 1710000000000,
              metadata: {},
            },
          },
        ];
      }

      return undefined;
    });
  });

  it('triggers idempotent legacy migration on first render', async () => {
    renderWithLayout();
    await waitFor(() => {
      expect(migrateLegacyMock).toHaveBeenCalledTimes(1);
      expect(migrateLegacyMock).toHaveBeenCalledWith({ limit: 8000 });
    });
  });

  it('saves quote cards via saveBlocks without overwriting the quote block', async () => {
    renderWithLayout();

    fireEvent.click(screen.getByRole('button', { name: /Reading Note 1/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mock Editor' }));

    await waitFor(
      () => {
        expect(updatePageMock).toHaveBeenCalledWith({ pageId, title: 'Reading Note 1' });
        expect(saveBlocksMock).toHaveBeenCalledWith({
          pageId,
          upsertBlocks: [
            {
              blockKey: 'note',
              blockType: 'paragraph',
              content: { text: 'updated' },
              props: { source: 'notebook' },
              sortOrder: 1,
            },
          ],
          deleteBlockKeys: undefined,
        });
      },
      { timeout: 7000 }
    );
  }, 15000);

  it('passes search/filter arguments into notePages:search query', async () => {
    renderWithLayout();

    fireEvent.change(screen.getByPlaceholderText('Search quote or note...'), {
      target: { value: 'grammar' },
    });

    fireEvent.change(screen.getByDisplayValue('All sources'), {
      target: { value: 'READING' },
    });

    await waitFor(
      () => {
        const latest = getLatestSearchArgs();
        expect(latest).not.toBeNull();
        expect(latest?.query).toBe('grammar');
        expect(Array.isArray(latest?.sourceModules)).toBe(true);
        expect((latest?.sourceModules as string[]).includes('READING_ARTICLE')).toBe(true);
      },
      { timeout: 7000 }
    );
  }, 15000);
});
