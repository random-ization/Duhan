import type { Id } from './_generated/dataModel';
import { query, internalMutation } from './_generated/server';

export const SEED_TOPICS = [
  { slug: 'vocab', nameKey: 'qa.topics.vocab', icon: '📝', order: 1 },
  { slug: 'grammar', nameKey: 'qa.topics.grammar', icon: '📘', order: 2 },
  { slug: 'topik', nameKey: 'qa.topics.topik', icon: '🎯', order: 3 },
  { slug: 'listening', nameKey: 'qa.topics.listening', icon: '🎧', order: 4 },
  { slug: 'writing', nameKey: 'qa.topics.writing', icon: '✍️', order: 5 },
  { slug: 'speaking', nameKey: 'qa.topics.speaking', icon: '🗣️', order: 6 },
  { slug: 'culture', nameKey: 'qa.topics.culture', icon: '🏯', order: 7 },
  { slug: 'resources', nameKey: 'qa.topics.resources', icon: '📂', order: 8 },
  { slug: 'general', nameKey: 'qa.topics.general', icon: '💬', order: 9 },
] as const;

export const listTopics = query({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db
      .query('qa_topics')
      .withIndex('by_order')
      .collect();

    if (topics.length === 0) {
      return SEED_TOPICS.map(t => ({
        _id: 'seed-topic' as unknown as Id<'qa_topics'>,
        slug: t.slug,
        nameKey: t.nameKey,
        icon: t.icon,
        order: t.order,
        isActive: true,
      }));
    }

    return topics.filter(t => t.isActive);
  },
});

export const seedTopics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('qa_topics').collect();
    if (existing.length > 0) return { seeded: 0 };

    let count = 0;
    for (const topic of SEED_TOPICS) {
      await ctx.db.insert('qa_topics', { ...topic, isActive: true });
      count++;
    }
    return { seeded: count };
  },
});
