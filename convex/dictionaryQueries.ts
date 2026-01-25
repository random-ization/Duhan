import { internalQuery } from './_generated/server';
import { v } from 'convex/values';

export type GrammarMatch = {
    id: string;
    title: string;
    summary: string;
    type: string;
    level: string;
};

export const getWordByLemmaQuery = internalQuery({
    args: { lemma: v.string() },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query('words')
            .withIndex('by_word', q => q.eq('word', args.lemma))
            .unique();
        if (!row) return null;
        return {
            word: row.word,
            meaning: row.meaning,
            partOfSpeech: row.partOfSpeech,
            pronunciation: row.pronunciation,
            hanja: row.hanja,
            audioUrl: row.audioUrl,
        };
    },
});

export const getGrammarPointsForMatchingQuery = internalQuery({
    args: {},
    handler: async ctx => {
        const all = await ctx.db.query('grammar_points').collect();
        return all
            .map(g => ({
                id: g._id,
                title: g.title,
                summary: g.summary,
                type: g.type,
                level: g.level,
                searchPatterns: Array.isArray(g.searchPatterns) ? g.searchPatterns : [],
            }))
            .filter(g => g.searchPatterns.length > 0);
    },
});
