
import { mutation, query, action, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { transcriptArrayValidator } from './transcriptSchema';
import { replaceTextbookUnitTranscriptChunks } from './transcriptStorage';
import { api, internal } from './_generated/api';
import OpenAI from 'openai';
import { type Id } from './_generated/dataModel';
import { type FunctionReference } from 'convex/server';

type TranslateYskInternalRefs = {
    getItemsToTranslate: FunctionReference<
        'query',
        'internal',
        { courseId: string; limit: number },
        TranslationItem[]
    >;
    getItemsToReview: FunctionReference<
        'query',
        'internal',
        {},
        any[]
    >;
    saveTranslations: FunctionReference<
        'mutation',
        'internal',
        {
            updates: Array<{
                appearanceId: Id<'vocabulary_appearances'>;
                wordId: Id<'words'>;
                meaningZh: string;
                meaningMn: string;
                meaningVi: string;
            }>;
        },
        number
    >;
    getUnitItemsForLocalization: FunctionReference<
        'query',
        'internal',
        { courseId: string; offset: number; limit: number },
        {
            total: number;
            items: UnitLocalizationItem[];
        }
    >;
    getGrammarItemsForLocalization: FunctionReference<
        'query',
        'internal',
        { courseId: string; offset: number; limit: number },
        {
            total: number;
            items: GrammarLocalizationItem[];
        }
    >;
};

const translateYskInternal: TranslateYskInternalRefs = (internal as unknown as { translateYsk: TranslateYskInternalRefs }).translateYsk;

// Defines the data structure that needs translating
type TranslationItem = {
    appearanceId: Id<'vocabulary_appearances'>;
    wordId: Id<'words'>;
    word: string;
    sourceMeaning: string;
};

type UnitLocalizationItem = {
    id: Id<'textbook_units'>;
    unitIndex: number;
    title: string;
    readingText: string;
    translation?: string;
    translationVi?: string;
    translationMn?: string;
};

type GrammarLocalizationItem = {
    id: Id<'grammar_points'>;
    unitIds: number[];
    title: string;
    summary: string;
    summaryEn?: string;
    summaryVi?: string;
    summaryMn?: string;
    explanation: string;
    explanationEn?: string;
    explanationVi?: string;
    explanationMn?: string;
    examples: Array<{
        kr: string;
        cn: string;
        en?: string;
        vi?: string;
        mn?: string;
        audio?: string;
    }>;
};

// Internal query to fetch items lacking translations
export const getItemsToTranslate = internalQuery({
    args: { courseId: v.string(), limit: v.number() },
    handler: async (ctx, args) => {
        const appearances = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
            .collect();

        const results: TranslationItem[] = [];

        for (const app of appearances) {
            if (results.length >= args.limit) break;

            // Extract current fields
            const meaningEn = app.meaningEn?.trim() || app.meaning?.trim() || '';
            const meaningZh = app.meaning?.trim() || '';
            const meaningMn = app.meaningMn?.trim() || '';
            const meaningVi = app.meaningVi?.trim() || '';

            // The localized meanings are sometimes identical to the source Korean or English, or just empty
            const needsChinese = !meaningZh || meaningZh === meaningEn;
            const needsMongolian = !meaningMn || meaningMn === meaningEn || meaningMn === app.meaning;
            const needsVietnamese = !meaningVi || meaningVi === meaningEn || meaningVi === app.meaning;

            // Include if ANY of them are missing
            if (meaningEn && (needsChinese || needsMongolian || needsVietnamese)) {
                const word = await ctx.db.get(app.wordId);
                if (word) {
                    results.push({
                        appearanceId: app._id,
                        wordId: word._id,
                        word: word.word,
                        sourceMeaning: meaningEn,
                    });
                }
            }
        }

        return results;
    },
});

export const getUnitItemsForLocalization = internalQuery({
    args: {
        courseId: v.string(),
        offset: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const allUnits = await ctx.db
            .query('textbook_units')
            .withIndex('by_course', q => q.eq('courseId', args.courseId))
            .collect();

        const visibleUnits = allUnits
            .filter(unit => unit.isArchived !== true)
            .sort((a, b) => (a.unitIndex - b.unitIndex) || (a.articleIndex - b.articleIndex));

        const items = visibleUnits.slice(args.offset, args.offset + args.limit).map(unit => ({
            id: unit._id,
            unitIndex: unit.unitIndex,
            title: unit.title,
            readingText: unit.readingText,
            translation: unit.translation,
            translationVi: unit.translationVi,
            translationMn: unit.translationMn,
        }));

        return {
            total: visibleUnits.length,
            items,
        };
    },
});

export const getGrammarItemsForLocalization = internalQuery({
    args: {
        courseId: v.string(),
        offset: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const links = await ctx.db
            .query('course_grammars')
            .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
            .collect();

        const byGrammarId = new Map<string, { grammarId: Id<'grammar_points'>; unitIds: number[] }>();
        for (const link of links) {
            const key = link.grammarId.toString();
            const existing = byGrammarId.get(key);
            if (existing) {
                existing.unitIds.push(link.unitId);
            } else {
                byGrammarId.set(key, { grammarId: link.grammarId, unitIds: [link.unitId] });
            }
        }

        const merged = [...byGrammarId.values()].sort(
            (a, b) =>
                Math.min(...a.unitIds) - Math.min(...b.unitIds) ||
                a.grammarId.toString().localeCompare(b.grammarId.toString())
        );

        const page = merged.slice(args.offset, args.offset + args.limit);
        const items: GrammarLocalizationItem[] = [];

        for (const row of page) {
            const grammar = await ctx.db.get(row.grammarId);
            if (!grammar) continue;
            items.push({
                id: grammar._id,
                unitIds: [...new Set(row.unitIds)].sort((a, b) => a - b),
                title: grammar.title,
                summary: grammar.summary,
                summaryEn: grammar.summaryEn,
                summaryVi: grammar.summaryVi,
                summaryMn: grammar.summaryMn,
                explanation: grammar.explanation,
                explanationEn: grammar.explanationEn,
                explanationVi: grammar.explanationVi,
                explanationMn: grammar.explanationMn,
                examples: grammar.examples,
            });
        }

        return {
            total: merged.length,
            items,
        };
    },
});

// Internal mutation to save translations to DB
export const saveTranslations = internalMutation({
    args: {
        updates: v.array(
            v.object({
                appearanceId: v.id('vocabulary_appearances'),
                wordId: v.id('words'),
                meaningZh: v.string(),
                meaningMn: v.string(),
                meaningVi: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        let updatedCount = 0;
        for (const update of args.updates) {
            // Update the master word
            const word = await ctx.db.get(update.wordId);
            if (word) {
                await ctx.db.patch(update.wordId, {
                    meaning: update.meaningZh,
                    meaningMn: update.meaningMn,
                    meaningVi: update.meaningVi,
                });
            }

            // Update the appearance
            const appearance = await ctx.db.get(update.appearanceId);
            if (appearance) {
                await ctx.db.patch(update.appearanceId, {
                    meaning: update.meaningZh, // use 'meaning' for Chinese
                    meaningMn: update.meaningMn,
                    meaningVi: update.meaningVi,
                });
                updatedCount++;
            }
        }
        return updatedCount;
    },
});

// Non-AI public write path for manual/KRDICT-based localization import.
export const saveTranslationsDirect = mutation({
    args: {
        updates: v.array(
            v.object({
                appearanceId: v.id('vocabulary_appearances'),
                wordId: v.id('words'),
                meaningZh: v.string(),
                meaningMn: v.string(),
                meaningVi: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        let updatedCount = 0;
        for (const update of args.updates) {
            const word = await ctx.db.get(update.wordId);
            if (word) {
                await ctx.db.patch(update.wordId, {
                    meaning: update.meaningZh,
                    meaningMn: update.meaningMn,
                    meaningVi: update.meaningVi,
                });
            }

            const appearance = await ctx.db.get(update.appearanceId);
            if (appearance) {
                await ctx.db.patch(update.appearanceId, {
                    meaning: update.meaningZh,
                    meaningMn: update.meaningMn,
                    meaningVi: update.meaningVi,
                });
                updatedCount++;
            }
        }
        return { success: true, count: updatedCount };
    },
});

function trimTranslation(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanSingleLine(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function isMissingLocale(value: string | undefined): boolean {
    return !value || value.trim().length === 0;
}

function shouldTranslateUnit(item: UnitLocalizationItem): boolean {
    return (
        isMissingLocale(item.translation) ||
        isMissingLocale(item.translationVi) ||
        isMissingLocale(item.translationMn)
    );
}

function hasHanCharacters(value: string | undefined): boolean {
    return !!value && /[\u4E00-\u9FFF]/.test(value);
}

function shouldTranslateGrammar(item: GrammarLocalizationItem): boolean {
    const summary = item.summary || '';
    const explanation = item.explanation || '';
    const summaryLikelyNotZh = !hasHanCharacters(summary);
    const explanationLikelyNotZh = !hasHanCharacters(explanation);

    if (summaryLikelyNotZh || explanationLikelyNotZh) return true;
    if (isMissingLocale(item.summaryVi) || isMissingLocale(item.summaryMn)) return true;
    if (isMissingLocale(item.explanationVi) || isMissingLocale(item.explanationMn)) return true;

    const hasMissingExampleLocales = item.examples.some(ex =>
        isMissingLocale(ex.cn) || isMissingLocale(ex.vi) || isMissingLocale(ex.mn)
    );
    return hasMissingExampleLocales;
}

// The main action running OpenAI
export const run = action({
    args: {
        courseId: v.optional(v.string()),
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const courseId = args.courseId ?? 'ysk-1';
        const limit = args.batchSize ?? 100;

        const items: TranslationItem[] = await ctx.runQuery(translateYskInternal.getItemsToTranslate, {
            courseId,
            limit,
        });

        console.log(`[Translate YSK] Found ${items.length} items needing translation.`);

        if (items.length === 0) {
            return { success: true, message: 'No items to translate' };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const CHUNK_SIZE = 25;
        const updates = [];

        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE);
            console.log(`[Translate YSK] Translating chunk ${i / CHUNK_SIZE + 1} (${chunk.length} items)`);

            const requestPayload = chunk.map((item: TranslationItem) => ({
                id: item.appearanceId,
                korean: item.word,
                english: item.sourceMeaning,
            }));

            const systemPrompt = `You are a professional dictionary terminology translator. 
Translate the provided English meanings of these Korean vocabulary words into Simplified Chinese (zh), Mongolian (mn, Cyrillic script), and Vietnamese (vi).
Pay attention to the provided Korean word context to ensure an accurate dictionary translation for language learners.

Return a JSON object strictly matching this schema:
{
  "translations": [
    {
      "id": "item ID",
      "meaningZh": "Simplified Chinese translation",
      "meaningMn": "Mongolian translation",
      "meaningVi": "Vietnamese translation"
    }
  ]
}
`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-5-nano',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(requestPayload) },
                    ],
                    response_format: { type: 'json_object' },
                });

                const resultJson = response.choices[0].message.content;
                if (resultJson) {
                    const parsed = JSON.parse(resultJson);

                    if (parsed.translations && Array.isArray(parsed.translations)) {
                        for (const t of parsed.translations) {
                            const originalItem = chunk.find((c: TranslationItem) => c.appearanceId === t.id);
                            if (originalItem) {
                                updates.push({
                                    appearanceId: originalItem.appearanceId,
                                    wordId: originalItem.wordId,
                                    meaningZh: t.meaningZh,
                                    meaningMn: t.meaningMn,
                                    meaningVi: t.meaningVi,
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[Translate YSK] OpenAI error:', err);
            }
        }

        if (updates.length > 0) {
            console.log(`[Translate YSK] Saving ${updates.length} translations to DB...`);
            const updatedCount: number = (await ctx.runMutation(translateYskInternal.saveTranslations, { updates })) as number;
            return { success: true, updatedCount };
        }

        return { success: false, message: 'Failed to translate any items' };
    },
});

export const auditCourseLocalization = query({
    args: {
        courseId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const courseId = args.courseId ?? 'ysk-2';

        const units = await ctx.db
            .query('textbook_units')
            .withIndex('by_course', q => q.eq('courseId', courseId))
            .collect();
        const visibleUnits = units.filter(unit => unit.isArchived !== true);
        const unitsMissing = visibleUnits.filter(
            unit =>
                isMissingLocale(unit.translation) ||
                isMissingLocale(unit.translationVi) ||
                isMissingLocale(unit.translationMn)
        );

        const links = await ctx.db
            .query('course_grammars')
            .withIndex('by_course_unit', q => q.eq('courseId', courseId))
            .collect();
        const grammarIds = [...new Set(links.map(link => link.grammarId.toString()))];
        const grammars = await Promise.all(grammarIds.map(id => ctx.db.get(id as Id<'grammar_points'>)));
        const grammarMissing = grammars.filter(Boolean).filter(grammar => shouldTranslateGrammar({
            id: grammar!._id,
            unitIds: [],
            title: grammar!.title,
            summary: grammar!.summary,
            summaryEn: grammar!.summaryEn,
            summaryVi: grammar!.summaryVi,
            summaryMn: grammar!.summaryMn,
            explanation: grammar!.explanation,
            explanationEn: grammar!.explanationEn,
            explanationVi: grammar!.explanationVi,
            explanationMn: grammar!.explanationMn,
            examples: grammar!.examples,
        }));

        const appearances = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_course_unit', q => q.eq('courseId', courseId))
            .collect();
        const vocabMissing = appearances.filter(app => {
            const zh = app.meaning?.trim() || '';
            const vi = app.meaningVi?.trim() || '';
            const mn = app.meaningMn?.trim() || '';
            return !zh || !vi || !mn;
        });

        return {
            courseId,
            units: {
                total: visibleUnits.length,
                missing: unitsMissing.length,
            },
            grammars: {
                total: grammarIds.length,
                missing: grammarMissing.length,
            },
            vocabulary: {
                total: appearances.length,
                missing: vocabMissing.length,
            },
        };
    },
});

export const runVocabLocalization = action({
    args: {
        courseId: v.optional(v.string()),
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const courseId = args.courseId ?? 'ysk-2';
        const limit = Math.max(1, Math.min(500, args.batchSize ?? 150));

        const items: TranslationItem[] = await ctx.runQuery(translateYskInternal.getItemsToTranslate, {
            courseId,
            limit,
        });

        if (items.length === 0) {
            return { success: true, courseId, processed: 0, updated: 0, hasMore: false };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const updates: Array<{
            appearanceId: Id<'vocabulary_appearances'>;
            wordId: Id<'words'>;
            meaningZh: string;
            meaningMn: string;
            meaningVi: string;
        }> = [];

        const CHUNK_SIZE = 25;
        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE);
            const payload = chunk.map(item => ({
                id: item.appearanceId,
                korean: item.word,
                english_hint: item.sourceMeaning,
            }));

            const systemPrompt = `You are a Korean dictionary localization expert.
Translate each Korean item into:
- meaningZh: Simplified Chinese
- meaningVi: Vietnamese
- meaningMn: Mongolian (Cyrillic)

Rules:
1) Korean text is the primary source of truth. English hint is only auxiliary.
2) Return concise learner-dictionary translations (single phrase preferred).
3) For sentence-like Korean input, provide a natural sentence translation.
4) Output strict JSON:
{
  "translations":[
    {"id":"...","meaningZh":"...","meaningVi":"...","meaningMn":"..."}
  ]
}`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-5-nano',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(payload) },
                    ],
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content || '';
                const parsed = JSON.parse(content) as {
                    translations?: Array<{
                        id?: string;
                        meaningZh?: string;
                        meaningVi?: string;
                        meaningMn?: string;
                    }>;
                };

                for (const item of parsed.translations || []) {
                    const source = chunk.find(row => row.appearanceId === item.id);
                    if (!source) continue;
                    const meaningZh = trimTranslation(item.meaningZh);
                    const meaningVi = trimTranslation(item.meaningVi);
                    const meaningMn = trimTranslation(item.meaningMn);
                    if (!meaningZh || !meaningVi || !meaningMn) continue;

                    updates.push({
                        appearanceId: source.appearanceId,
                        wordId: source.wordId,
                        meaningZh: cleanSingleLine(meaningZh),
                        meaningVi: cleanSingleLine(meaningVi),
                        meaningMn: cleanSingleLine(meaningMn),
                    });
                }
            } catch (error) {
                console.error('[Translate YSK][Vocab] Failed chunk:', error);
            }
        }

        if (updates.length === 0) {
            return {
                success: false,
                courseId,
                processed: items.length,
                updated: 0,
                hasMore: items.length === limit,
            };
        }

        const updated = await ctx.runMutation(translateYskInternal.saveTranslations, { updates });
        return {
            success: true,
            courseId,
            processed: items.length,
            updated,
            hasMore: items.length === limit,
        };
    },
});

export const runUnitLocalization = action({
    args: {
        courseId: v.optional(v.string()),
        offset: v.optional(v.number()),
        batchSize: v.optional(v.number()),
        dryRun: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const courseId = args.courseId ?? 'ysk-2';
        const offset = Math.max(0, args.offset ?? 0);
        const limit = Math.max(1, Math.min(10, args.batchSize ?? 4));
        const dryRun = args.dryRun ?? false;

        const page = await ctx.runQuery(translateYskInternal.getUnitItemsForLocalization, {
            courseId,
            offset,
            limit,
        });
        const items = page.items.filter(shouldTranslateUnit);

        if (items.length === 0) {
            return {
                success: true,
                courseId,
                dryRun,
                processed: page.items.length,
                updated: 0,
                offset,
                nextOffset: offset + page.items.length,
                hasMore: offset + page.items.length < page.total,
            };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const updates: Array<{
            id: Id<'textbook_units'>;
            translation: string;
            translationVi: string;
            translationMn: string;
        }> = [];

        for (const item of items) {
            const payload = {
                id: item.id,
                titleKorean: item.title,
                readingKorean: item.readingText,
            };

            const systemPrompt = `Translate Korean reading content into 3 target languages.
Return strict JSON:
{
  "id":"same id",
  "translationZh":"Simplified Chinese",
  "translationVi":"Vietnamese",
  "translationMn":"Mongolian Cyrillic"
}
Use natural learner-friendly translation and preserve core meaning.`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-5-nano',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(payload) },
                    ],
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content || '';
                const parsed = JSON.parse(content) as {
                    id?: string;
                    translationZh?: string;
                    translationVi?: string;
                    translationMn?: string;
                };

                const translationZh = trimTranslation(parsed.translationZh);
                const translationVi = trimTranslation(parsed.translationVi);
                const translationMn = trimTranslation(parsed.translationMn);
                if (!translationZh || !translationVi || !translationMn) continue;

                updates.push({
                    id: item.id,
                    translation: translationZh,
                    translationVi,
                    translationMn,
                });
            } catch (error) {
                console.error('[Translate YSK][Units] Failed item:', item.id, error);
            }
        }

        if (!dryRun && updates.length > 0) {
            await ctx.runMutation(api.translateYsk.updateUnitTranslations, { updates });
        }

        return {
            success: true,
            courseId,
            dryRun,
            processed: page.items.length,
            translatedCandidates: items.length,
            updated: updates.length,
            offset,
            nextOffset: offset + page.items.length,
            hasMore: offset + page.items.length < page.total,
            sampleUnitIds: updates.slice(0, 5).map(item => item.id),
        };
    },
});

export const runGrammarLocalization = action({
    args: {
        courseId: v.optional(v.string()),
        offset: v.optional(v.number()),
        batchSize: v.optional(v.number()),
        dryRun: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const courseId = args.courseId ?? 'ysk-2';
        const offset = Math.max(0, args.offset ?? 0);
        const limit = Math.max(1, Math.min(8, args.batchSize ?? 3));
        const dryRun = args.dryRun ?? false;

        const page = await ctx.runQuery(translateYskInternal.getGrammarItemsForLocalization, {
            courseId,
            offset,
            limit,
        });
        const items = page.items.filter(shouldTranslateGrammar);

        if (items.length === 0) {
            return {
                success: true,
                courseId,
                dryRun,
                processed: page.items.length,
                updated: 0,
                offset,
                nextOffset: offset + page.items.length,
                hasMore: offset + page.items.length < page.total,
            };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const updates: Array<{
            id: Id<'grammar_points'>;
            summary: string;
            summaryEn?: string;
            summaryVi: string;
            summaryMn: string;
            explanation: string;
            explanationEn?: string;
            explanationVi: string;
            explanationMn: string;
            examples: Array<{
                kr: string;
                cn: string;
                en?: string;
                vi?: string;
                mn?: string;
                audio?: string;
            }>;
        }> = [];

        for (const item of items) {
            const payload = {
                id: item.id,
                title: item.title,
                summaryHint: item.summaryEn || item.summary,
                explanationHint: item.explanationEn || item.explanation,
                examples: item.examples.map(example => ({ kr: example.kr, hint: example.en || example.cn })),
            };

            const systemPrompt = `You are localizing Korean grammar cards for learners.
Translate each grammar card into:
- Chinese (Simplified): summaryZh, explanationZh, exampleZh list
- Vietnamese: summaryVi, explanationVi, exampleVi list
- Mongolian Cyrillic: summaryMn, explanationMn, exampleMn list

Prioritize Korean grammar title and Korean examples as the source of truth.
Return strict JSON:
{
  "id":"same id",
  "summaryZh":"...",
  "summaryVi":"...",
  "summaryMn":"...",
  "explanationZh":"...",
  "explanationVi":"...",
  "explanationMn":"...",
  "exampleZh":["..."],
  "exampleVi":["..."],
  "exampleMn":["..."]
}`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-5-nano',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(payload) },
                    ],
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content || '';
                const parsed = JSON.parse(content) as {
                    id?: string;
                    summaryZh?: string;
                    summaryVi?: string;
                    summaryMn?: string;
                    explanationZh?: string;
                    explanationVi?: string;
                    explanationMn?: string;
                    exampleZh?: string[];
                    exampleVi?: string[];
                    exampleMn?: string[];
                };

                const summaryZh = trimTranslation(parsed.summaryZh);
                const summaryVi = trimTranslation(parsed.summaryVi);
                const summaryMn = trimTranslation(parsed.summaryMn);
                const explanationZh = trimTranslation(parsed.explanationZh);
                const explanationVi = trimTranslation(parsed.explanationVi);
                const explanationMn = trimTranslation(parsed.explanationMn);
                if (!summaryZh || !summaryVi || !summaryMn || !explanationZh || !explanationVi || !explanationMn) {
                    continue;
                }

                const zhExamples = Array.isArray(parsed.exampleZh) ? parsed.exampleZh : [];
                const viExamples = Array.isArray(parsed.exampleVi) ? parsed.exampleVi : [];
                const mnExamples = Array.isArray(parsed.exampleMn) ? parsed.exampleMn : [];
                const examples = item.examples.map((example, idx) => ({
                    ...example,
                    cn: trimTranslation(zhExamples[idx]) || example.cn,
                    vi: trimTranslation(viExamples[idx]) || example.vi,
                    mn: trimTranslation(mnExamples[idx]) || example.mn,
                }));

                const summaryEnFallback = item.summaryEn || (!hasHanCharacters(item.summary) ? item.summary : undefined);
                const explanationEnFallback =
                    item.explanationEn || (!hasHanCharacters(item.explanation) ? item.explanation : undefined);

                updates.push({
                    id: item.id,
                    summary: summaryZh,
                    summaryEn: summaryEnFallback,
                    summaryVi,
                    summaryMn,
                    explanation: explanationZh,
                    explanationEn: explanationEnFallback,
                    explanationVi,
                    explanationMn,
                    examples,
                });
            } catch (error) {
                console.error('[Translate YSK][Grammar] Failed item:', item.id, error);
            }
        }

        if (!dryRun && updates.length > 0) {
            await ctx.runMutation(api.translateYsk.updateGrammarTranslations, { updates });
        }

        return {
            success: true,
            courseId,
            dryRun,
            processed: page.items.length,
            translatedCandidates: items.length,
            updated: updates.length,
            offset,
            nextOffset: offset + page.items.length,
            hasMore: offset + page.items.length < page.total,
            sampleGrammarIds: updates.slice(0, 5).map(item => item.id),
        };
    },
});

// A simple query to fetch words for review
export const getItemsToReview = query({
    args: {},
    handler: async (ctx) => {
        const appearances = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_course_unit', q => q.eq('courseId', 'ysk-1'))
            .collect();
        const results = [];
        for (const app of appearances) {
            const word = await ctx.db.get(app.wordId);
            if (word) {
                results.push({
                    appearanceId: app._id,
                    wordId: word._id,
                    word: word.word,
                    meaningEn: app.meaningEn,
                    meaningZh: app.meaning,
                    meaningMn: app.meaningMn,
                    meaningVi: app.meaningVi,
                });
            }
        }
        return results;
    }
});

// Re-translate explicitly all items with strict prompt
export const runFix = action({
    args: { offset: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const items: any[] = await ctx.runQuery(translateYskInternal.getItemsToReview);
        const offset = args.offset || 0;
        const chunk = items.slice(offset, offset + 30);

        console.log(`[Translate YSK] Fixing chunk offset ${offset} (${chunk.length} items) out of ${items.length}`);

        if (chunk.length === 0) {
            return { success: true, totalUpdated: 0, hasMore: false };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        let totalUpdated = 0;

        const requestPayload = chunk.map((item: any) => ({
            id: item.appearanceId,
            korean: item.word,
            english_context: item.meaningEn || "",
        }));

        const systemPrompt = `You are an expert bilingual dictionary creator.
You are given a list of Korean vocabulary words and their English contextual meanings.
Provide the most accurate, concise, single-word or short-phrase translation in Simplified Chinese (zh), Mongolian (mn, Cyrillic), and Vietnamese (vi).

CRITICAL RULES:
1. Provide ONLY the direct translation of the Korean word. Do not include articles, punctuation (NO periods at the end of words), or explanations.
2. If the English context is a list of words separated by slashes (e.g. "College student / Designer / Actor"), do NOT translate all of them. Translate ONLY the core meaning of the Korean word. For example, if Korean is "가수" (Singer), just translate "Singer" and ignore the rest of the list.
3. If the English context contains extra notes in parentheses, ignore the notes and just translate the main word.
4. If the Korean word is a verb/adjective ending in ~다, provide the base dictionary form in the target language.
5. Do NOT include numbers (like "1. ", "2. ") or POS tags (like "n.", "v."). Keep the answer as short as a normal flashcard.

Return a strictly valid JSON object matching this schema:
{
  "translations": [
    {
      "id": "item ID",
      "meaningZh": "Clean Chinese translation",
      "meaningMn": "Clean Mongolian translation",
      "meaningVi": "Clean Vietnamese translation"
    }
  ]
}
`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(requestPayload) },
                ],
                response_format: { type: 'json_object' },
            });

            const resultJson = response.choices[0].message.content;
            const updates = [];
            if (resultJson) {
                const parsed = JSON.parse(resultJson);
                if (parsed.translations && Array.isArray(parsed.translations)) {
                    for (const t of parsed.translations) {
                        const originalItem = chunk.find((c: any) => c.appearanceId === t.id);
                        if (originalItem) {
                            updates.push({
                                appearanceId: originalItem.appearanceId,
                                wordId: originalItem.wordId,
                                meaningZh: t.meaningZh,
                                meaningMn: t.meaningMn,
                                meaningVi: t.meaningVi,
                            });
                        }
                    }
                }
            }

            if (updates.length > 0) {
                const updatedCount: number = (await ctx.runMutation(translateYskInternal.saveTranslations, { updates })) as number;
                totalUpdated += updatedCount;
            }
        } catch (err) {
            console.error('[Translate YSK] OpenAI error during fix:', err);
        }

        return { success: true, totalUpdated, nextOffset: offset + 30, hasMore: offset + 30 < items.length };
    }
});

export const getBadTranslations = query({
    args: {},
    handler: async (ctx) => {
        const appearances = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_course_unit', q => q.eq('courseId', 'ysk-1'))
            .collect();
        const bad = [];
        for (const app of appearances) {
            const word = await ctx.db.get(app.wordId);
            if (word) {
                const isBadZh = app.meaning && (app.meaning.length > 20 || /[a-zA-Z1-9。]/.test(app.meaning));
                const isBadMn = app.meaningMn && (app.meaningMn.length > 30 || /[a-zA-Z1-9]/.test(app.meaningMn) || app.meaningMn.endsWith('.'));
                const isBadVi = app.meaningVi && (app.meaningVi.length > 30 || /[1-9]/.test(app.meaningVi) || app.meaningVi.endsWith('.'));

                if (isBadZh || isBadMn || isBadVi) {
                    bad.push({
                        appearanceId: app._id,
                        wordId: word._id,
                        word: word.word,
                        meaningEn: app.meaningEn,
                        meaningZh: app.meaning,
                        meaningMn: app.meaningMn,
                        meaningVi: app.meaningVi,
                    });
                }
            }
        }
        return bad;
    }
});

export const fixSemantics = action({
    args: { offset: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const items: any[] = await ctx.runQuery(translateYskInternal.getItemsToReview);
        const offset = args.offset || 0;
        const chunk = items.slice(offset, offset + 30);

        console.log(`[Translate YSK] Fixing semantics chunk offset ${offset} (${chunk.length} items) out of ${items.length}`);

        if (chunk.length === 0) {
            return { success: true, totalUpdated: 0, hasMore: false };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        let totalUpdated = 0;

        const requestPayload = chunk.map((item: any) => ({
            id: item.appearanceId,
            korean: item.word,
            english_hint: item.meaningEn || "",
        }));

        const systemPrompt = `You are an expert bilingual dictionary creator for learners of Korean.
You are given a list of Korean vocabulary words/phrases and an English hint that shows how it was used in context.

CRITICAL INSTRUCTIONS:
1. Translate the KOREAN text into Simplified Chinese (zh), Mongolian (mn, Cyrillic), and Vietnamese (vi).
2. DO NOT just translate the English hint. The English hint is often a full sentence or a specific contextual usage (like translating "아침" as "breakfast" instead of "morning", or translating an entire sentence as just the verb).
3. Provide the standalone dictionary translation of the KOREAN text. For example:
   "아침" -> "早晨 / 早餐" (Morning / Breakfast)
   "시간" -> "时间" (Time)
   "가수" -> "歌手" (Singer)
4. If the Korean text is a full sentence (e.g., "비빔밥 하나 주세요" or "오늘은 평일이에요"), translate the FULL Korean sentence naturally.
5. If the Korean text is a grammar pattern or phrase snippet (e.g., "시 부터 4시 까지"), translate that snippet exactly.
6. Keep the translation concise without punctuation at the end for single words.

Return a JSON object exactly matching this schema:
{
  "translations": [
    {
      "id": "item ID",
      "meaningZh": "Chinese translation",
      "meaningMn": "Mongolian translation",
      "meaningVi": "Vietnamese translation"
    }
  ]
}
`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(requestPayload) },
                ],
                response_format: { type: 'json_object' },
            });

            const resultJson = response.choices[0].message.content;
            const updates = [];
            if (resultJson) {
                const parsed = JSON.parse(resultJson);
                if (parsed.translations && Array.isArray(parsed.translations)) {
                    for (const t of parsed.translations) {
                        const originalItem = chunk.find((c: any) => c.appearanceId === t.id);
                        if (originalItem) {
                            updates.push({
                                appearanceId: originalItem.appearanceId,
                                wordId: originalItem.wordId,
                                meaningZh: t.meaningZh,
                                meaningMn: t.meaningMn,
                                meaningVi: t.meaningVi,
                            });
                        }
                    }
                }
            }

            if (updates.length > 0) {
                const updatedCount: number = (await ctx.runMutation(translateYskInternal.saveTranslations, { updates })) as number;
                totalUpdated += updatedCount;
            }
        } catch (err) {
            console.error('[Translate YSK] OpenAI error during semantics fix:', err);
        }

        return { success: true, totalUpdated, nextOffset: offset + 30, hasMore: offset + 30 < items.length };
    }
});

export const manualFixes = mutation({
    args: {},
    handler: async (ctx) => {
        const apps = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_course_unit', q => q.eq('courseId', 'ysk-1'))
            .collect();

        for (const app of apps) {
            const word = await ctx.db.get(app.wordId);
            if (!word) continue;

            const knWord = word.word.normalize('NFC').trim();

            let meaningZh, meaningMn, meaningVi;
            if (knWord === '방에 침대하고 옷장이 있어요') {
                meaningZh = "房间里有床和衣柜。";
                meaningMn = "Өрөөнд ор дэр болон шүүгээ байна.";
                meaningVi = "Trong phòng có giường và tủ quần áo.";
            } else if (knWord === '비빔밥 하나 주세요') {
                meaningZh = "请给我一个拌饭。";
                meaningMn = "Надад нэг бибимбап өгөөч.";
                meaningVi = "Cho tôi một bát bibimbap.";
            } else if (knWord === '시 부터 4시 까지') {
                meaningZh = "三点到四点";
                meaningMn = "Гурван цагаас дөрвөн цаг хүртэл";
                meaningVi = "Từ 3 giờ đến 4 giờ";
            } else if (knWord === '아침') {
                meaningZh = "早晨 / 早餐";
                meaningMn = "Өглөө / Өглөөний хоол";
                meaningVi = "Buổi sáng / Bữa sáng";
            } else if (knWord === '점심') {
                meaningZh = "中午 / 午餐";
                meaningMn = "Өдөр / Өдрийн хоол";
                meaningVi = "Buổi trưa / Bữa trưa";
            } else if (knWord === '저녁') {
                meaningZh = "晚上 / 晚餐";
                meaningMn = "Орой / Оройн хоол";
                meaningVi = "Buổi tối / Bữa tối";
            }

            if (meaningZh) {
                await ctx.db.patch(word._id, {
                    meaning: meaningZh,
                    meaningMn,
                    meaningVi
                });
                await ctx.db.patch(app._id, {
                    meaning: meaningZh,
                    meaningMn,
                    meaningVi
                });
            }
        }
        return { success: true };
    }
});

export const updateVocabTranslations = mutation({
    args: {
        updates: v.array(v.object({
            id: v.id('words'),
            meaning: v.optional(v.string()),
            meaningVi: v.optional(v.string()),
            meaningMn: v.optional(v.string()),
        }))
    },
    handler: async (ctx, args) => {
        for (const update of args.updates) {
            const { id, ...data } = update;
            await ctx.db.patch(id, data);
        }
        return { success: true, count: args.updates.length };
    }
});

export const updateUnitTranslations = mutation({
    args: {
        updates: v.array(v.object({
            id: v.id('textbook_units'),
            translation: v.optional(v.string()),
            translationEn: v.optional(v.string()),
            translationVi: v.optional(v.string()),
            translationMn: v.optional(v.string()),
            transcriptData: v.optional(transcriptArrayValidator),
        }))
    },
    handler: async (ctx, args) => {
        for (const update of args.updates) {
            const { id, transcriptData, ...data } = update;
            await ctx.db.patch(id, data);

            if (transcriptData) {
                const transcriptWrite = await replaceTextbookUnitTranscriptChunks(
                    ctx,
                    id,
                    transcriptData
                );
                await ctx.db.patch(id, {
                    transcriptData: [], // Clear legacy inline field
                    transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
                    transcriptChunkCount: transcriptWrite.chunkCount,
                    transcriptSegmentCount: transcriptWrite.segmentCount,
                });
            }
        }
        return { success: true, count: args.updates.length };
    }
});

const GrammarLocalizedTextValidator = v.object({
    zh: v.optional(v.string()),
    en: v.optional(v.string()),
    vi: v.optional(v.string()),
    mn: v.optional(v.string()),
});

const GrammarSectionsValidator = v.object({
    introduction: v.optional(GrammarLocalizedTextValidator),
    core: v.optional(GrammarLocalizedTextValidator),
    comparative: v.optional(GrammarLocalizedTextValidator),
    cultural: v.optional(GrammarLocalizedTextValidator),
    commonMistakes: v.optional(GrammarLocalizedTextValidator),
    review: v.optional(GrammarLocalizedTextValidator),
});

const GrammarQuizItemValidator = v.object({
    prompt: GrammarLocalizedTextValidator,
    answer: v.optional(GrammarLocalizedTextValidator),
});

export const updateGrammarTranslations = mutation({
    args: {
        updates: v.array(v.object({
            id: v.id('grammar_points'),
            titleEn: v.optional(v.string()),
            titleZh: v.optional(v.string()),
            titleVi: v.optional(v.string()),
            titleMn: v.optional(v.string()),
            summary: v.optional(v.string()),
            summaryEn: v.optional(v.string()),
            summaryVi: v.optional(v.string()),
            summaryMn: v.optional(v.string()),
            explanation: v.optional(v.string()),
            explanationEn: v.optional(v.string()),
            explanationVi: v.optional(v.string()),
            explanationMn: v.optional(v.string()),
            sections: v.optional(GrammarSectionsValidator),
            quizItems: v.optional(v.array(GrammarQuizItemValidator)),
            examples: v.optional(v.array(v.object({
                kr: v.string(),
                cn: v.string(),
                en: v.optional(v.string()),
                vi: v.optional(v.string()),
                mn: v.optional(v.string()),
                audio: v.optional(v.string()),
            })))
        }))
    },
    handler: async (ctx, args) => {
        for (const update of args.updates) {
            const { id, ...data } = update;
            await ctx.db.patch(id, data);
        }
        return { success: true, count: args.updates.length };
    }
});

type ListeningTranscriptSegment = {
    start: number;
    end: number;
    text: string;
    translation?: string;
    translationEn?: string;
    translationVi?: string;
    translationMn?: string;
    words?: Array<{ word: string; start: number; end: number }>;
    tokens?: Array<{ surface: string; base: string; pos: string }>;
};

type ListeningBackfillTarget = {
    code: 'zh' | 'en' | 'vi' | 'mn';
    field: 'translation' | 'translationEn' | 'translationVi' | 'translationMn';
    label: string;
};

const LISTENING_BACKFILL_TARGETS: ListeningBackfillTarget[] = [
    { code: 'zh', field: 'translation', label: 'Simplified Chinese' },
    { code: 'en', field: 'translationEn', label: 'English' },
    { code: 'vi', field: 'translationVi', label: 'Vietnamese' },
    { code: 'mn', field: 'translationMn', label: 'Mongolian' },
];

function normalizeTranscriptText(value: string): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

async function translateTranscriptBatch(
    openai: OpenAI,
    target: ListeningBackfillTarget,
    items: Array<{ id: number; text: string }>
) {
    if (items.length === 0) return [] as string[];

    const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content:
                    'You translate Korean listening transcript lines. Preserve line order and speaker labels. Return JSON only.',
            },
            {
                role: 'user',
                content: JSON.stringify({
                    targetLanguage: target.label,
                    rules: [
                        'Keep speaker names and colon style.',
                        'Do not merge/split lines.',
                        'Natural and concise translation.',
                    ],
                    items,
                    output: { translations: [{ id: 1, text: 'translated text' }] },
                }),
            },
        ],
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as unknown;
    const map = new Map<number, string>();

    const tryRows = (rows: unknown) => {
        if (!Array.isArray(rows)) return;
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            if (typeof row === 'string') {
                const fallbackId = items[i]?.id;
                const text = normalizeTranscriptText(row);
                if (typeof fallbackId === 'number' && text) map.set(fallbackId, text);
                continue;
            }
            if (!row || typeof row !== 'object') continue;
            const record = row as Record<string, unknown>;
            const idRaw = record.id ?? record.index;
            const id =
                typeof idRaw === 'number'
                    ? idRaw
                    : typeof idRaw === 'string'
                        ? Number.parseInt(idRaw, 10)
                        : Number.NaN;
            const text = normalizeTranscriptText(
                String(record.text ?? record.translation ?? record.translated ?? '')
            );
            if (Number.isFinite(id) && text) {
                map.set(id, text);
            }
        }
    };

    if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        tryRows(record.translations);
        tryRows(record.items);
        tryRows(record.results);

        if (map.size === 0) {
            for (const item of items) {
                const byId = normalizeTranscriptText(String(record[item.id] ?? ''));
                if (byId) map.set(item.id, byId);
            }
        }
    }

    return items.map(item => map.get(item.id) || '');
}

export const backfillListeningTranslations = action({
    args: {
        courseId: v.string(),
        languages: v.optional(v.array(v.string())),
        unitIndex: v.optional(v.number()),
        dryRun: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured on Convex');
        }
        const openai = new OpenAI({ apiKey });

        const requestedLanguageSet = new Set(
            (args.languages || ['zh'])
                .map(lang => String(lang || '').trim().toLowerCase())
                .filter(Boolean)
        );
        const targets = LISTENING_BACKFILL_TARGETS.filter(target =>
            requestedLanguageSet.has(target.code)
        );
        if (targets.length === 0) {
            return {
                success: true,
                courseId: args.courseId,
                dryRun: args.dryRun === true,
                scannedUnits: 0,
                updatedUnits: 0,
                translatedSegments: {},
                message: 'No valid languages requested',
            };
        }

        const allUnits = (await ctx.runQuery(api.units.getByCourse, {
            courseId: args.courseId,
        })) as Array<{
            _id: Id<'textbook_units'>;
            unitIndex: number;
            articleIndex: number;
            title: string;
            transcriptData?: ListeningTranscriptSegment[];
        }>;

        const units = allUnits
            .filter(unit => (typeof args.unitIndex === 'number' ? unit.unitIndex === args.unitIndex : true))
            .sort((a, b) => (a.unitIndex - b.unitIndex) || (a.articleIndex - b.articleIndex));

        const dryRun = args.dryRun === true;
        const translatedSegments: Record<string, number> = {};
        for (const target of targets) translatedSegments[target.code] = 0;

        let updatedUnits = 0;
        const samples: Array<{
            unitIndex: number;
            articleIndex: number;
            title: string;
            filled: Record<string, number>;
        }> = [];

        for (const unit of units) {
            const transcript = Array.isArray(unit.transcriptData) ? unit.transcriptData : [];
            if (transcript.length === 0) continue;

            const next = transcript.map(segment => ({ ...segment }));
            let unitChanged = false;
            const unitFilled: Record<string, number> = {};

            for (const target of targets) {
                const missing = next
                    .map((segment, index) => ({
                        id: index + 1,
                        index,
                        text: normalizeTranscriptText(segment.text),
                        existing: normalizeTranscriptText(String(segment[target.field] || '')),
                    }))
                    .filter(item => item.text && !item.existing);

                if (missing.length === 0) continue;

                let filled = 0;
                for (const batch of chunkArray(missing, 24)) {
                    const translated = await translateTranscriptBatch(
                        openai,
                        target,
                        batch.map(item => ({ id: item.id, text: item.text }))
                    );
                    for (let i = 0; i < batch.length; i += 1) {
                        const translatedLine = normalizeTranscriptText(translated[i] || '');
                        if (!translatedLine) continue;
                        next[batch[i].index][target.field] = translatedLine;
                        filled += 1;
                    }
                }

                if (filled > 0) {
                    unitChanged = true;
                    translatedSegments[target.code] += filled;
                    unitFilled[target.code] = filled;
                }
            }

            if (!unitChanged) continue;
            updatedUnits += 1;

            if (!dryRun) {
                await ctx.runMutation(api.translateYsk.updateUnitTranslations, {
                    updates: [
                        {
                            id: unit._id,
                            transcriptData: next,
                        },
                    ],
                });
            }

            if (samples.length < 20) {
                samples.push({
                    unitIndex: unit.unitIndex,
                    articleIndex: unit.articleIndex,
                    title: unit.title,
                    filled: unitFilled,
                });
            }
        }

        return {
            success: true,
            courseId: args.courseId,
            dryRun,
            requestedLanguages: targets.map(target => target.code),
            scannedUnits: units.length,
            updatedUnits,
            translatedSegments,
            samples,
        };
    },
});
