import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

const NotebookGeneralContentValidator = v.object({
  text: v.string(),
  notes: v.optional(v.string()),
  source: v.optional(v.string()),
  articleId: v.optional(v.string()),
  articleTitle: v.optional(v.string()),
  articleSource: v.optional(v.string()),
  color: v.optional(v.string()),
  createdAt: v.optional(v.number()),
});

const NotebookMistakeContentValidator = v.object({
  questionText: v.string(),
  options: v.array(v.string()),
  correctAnswer: v.number(),
  imageUrl: v.optional(v.string()),
  aiAnalysis: v.object({
    translation: v.string(),
    keyPoint: v.string(),
    analysis: v.string(),
    wrongOptions: v.array(v.string()),
  }),
});

const NotebookVocabContentValidator = v.object({
  word: v.string(),
  pronunciation: v.optional(v.string()),
  meaning: v.optional(v.string()),
  context: v.optional(v.string()),
  analysis: v.optional(v.string()),
  examTitle: v.optional(v.string()),
});

const NotebookContentValidator = v.union(
  v.string(),
  NotebookGeneralContentValidator,
  NotebookMistakeContentValidator,
  NotebookVocabContentValidator
);

// Save notebook entry
export const save = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    content: NotebookContentValidator,
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { type, title, content, tags } = args;

    // Generate preview from content
    let preview = '';
    if (typeof content === 'string') {
      preview = content.slice(0, 100);
    } else if ('text' in content && typeof content.text === 'string') {
      preview = content.text.slice(0, 100);
    }

    const notebookId = await ctx.db.insert('notebooks', {
      userId,
      type,
      title,
      content,
      preview,
      tags: tags || [],
      createdAt: Date.now(),
    });

    return {
      success: true,
      data: {
        id: notebookId,
        type,
        title,
        preview,
        tags: tags || [],
        createdAt: new Date().toISOString(),
      },
    };
  },
});

// Get notebook list
export const list = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return { success: true, data: [] };

    const { type } = args;

    let notebooks = await ctx.db
      .query('notebooks')
      .filter(q => q.eq(q.field('userId'), userId))
      .collect();

    if (type) {
      notebooks = notebooks.filter(n => n.type === type);
    }

    return {
      success: true,
      data: notebooks.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        preview: n.preview,
        tags: n.tags,
        createdAt: new Date(n.createdAt).toISOString(),
      })),
    };
  },
});

// Get notebook detail
export const getDetail = query({
  args: {
    notebookId: v.id('notebooks'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const notebook = await ctx.db.get(args.notebookId);

    if (!notebook) {
      return { success: false, data: null };
    }
    if (notebook.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN' });
    }

    return {
      success: true,
      data: {
        id: notebook._id,
        type: notebook.type,
        title: notebook.title,
        preview: notebook.preview,
        tags: notebook.tags,
        content: notebook.content,
        createdAt: new Date(notebook.createdAt).toISOString(),
      },
    };
  },
});

// Delete notebook
export const remove = mutation({
  args: {
    notebookId: v.id('notebooks'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) return { success: false, error: 'Not found' };
    if (notebook.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    await ctx.db.delete(args.notebookId);
    return { success: true };
  },
});
