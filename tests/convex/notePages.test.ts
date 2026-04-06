import { describe, expect, it, beforeAll } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

describe('NotePages Module Integration Tests', () => {
  let test: ReturnType<typeof convexTest>;

  beforeAll(() => {
    test = convexTest(api);
  });

  describe('NotePages Queries', () => {
    it('should list pages for a user', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create some test pages
        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Test Page 1',
          tags: ['test'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          sortOrder: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Test Page 2',
          tags: ['test'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          sortOrder: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return user;
      });

      const pages = await test.query(api.notePages.listPages);

      expect(pages).toHaveLength(2);
      expect(pages[0].title).toBe('Test Page 1');
      expect(pages[1].title).toBe('Test Page 2');
    });

    it('should list notebooks for a user', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create notebook containers
        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Default Notebook',
          metadata: {
            kind: 'notebook_container',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Study Notes',
          metadata: {
            kind: 'notebook_container',
            notebookKey: 'study',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return user;
      });

      const notebooks = await test.query(api.notePages.listNotebooks);

      expect(notebooks).toHaveLength(2);
      expect(notebooks[0].title).toBe('Default Notebook');
      expect(notebooks[1].title).toBe('Study Notes');
    });

    it('should search pages', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create searchable pages
        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Korean Grammar Notes',
          previewText: 'This page contains Korean grammar rules and examples',
          tags: ['korean', 'grammar'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Vocabulary Practice',
          previewText: 'Practice vocabulary with flashcards and exercises',
          tags: ['vocabulary', 'practice'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return user;
      });

      const result = await test.query(api.notePages.search, {
        query: 'korean',
      });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].title).toBe('Korean Grammar Notes');
      expect(result.facets).toHaveLength(1);
      expect(result.facets[0].type).toBe('longform_page');
    });
  });

  describe('NotePages Mutations', () => {
    it('should create a notebook', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.mutation(api.notePages.createNotebook, {
        title: 'My Notebook',
        icon: '📚',
        notebookKey: 'my-notebook',
      });

      expect(result.success).toBe(true);
      expect(result.pageId).toBeDefined();
    });

    it('should create a page', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.mutation(api.notePages.createPage, {
        notebookKey: 'default',
        title: 'New Page',
        kind: 'longform_page',
        tags: ['test'],
        blocks: [
          {
            blockType: 'paragraph',
            content: 'This is a test paragraph',
            sortOrder: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.pageId).toBeDefined();
    });

    it('should update a page', async () => {
      const pageId = await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create a page
        const page = await ctx.db.insert('note_pages', {
          userId: user,
          title: 'Original Title',
          tags: ['original'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return page;
      });

      const result = await test.mutation(api.notePages.updatePage, {
        pageId,
        title: 'Updated Title',
        tags: ['updated'],
        blocks: [
          {
            blockType: 'paragraph',
            content: 'Updated content',
            sortOrder: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should archive a page', async () => {
      const pageId = await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create a page
        const page = await ctx.db.insert('note_pages', {
          userId: user,
          title: 'To Archive',
          tags: ['test'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return page;
      });

      const result = await test.mutation(api.notePages.archivePage, {
        pageId,
      });

      expect(result.success).toBe(true);
    });

    it('should toggle pin status', async () => {
      const pageId = await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create a page
        const page = await ctx.db.insert('note_pages', {
          userId: user,
          title: 'To Pin',
          tags: ['test'],
          metadata: {
            kind: 'longform_page',
            notebookKey: 'default',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return page;
      });

      const result = await test.mutation(api.notePages.togglePin, {
        pageId,
      });

      expect(result.success).toBe(true);
      expect(result.pinned).toBe(true);
    });
  });
});
