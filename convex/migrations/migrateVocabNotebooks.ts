import { mutation } from "../_generated/server";
import { getAuthUserId } from "../utils";

/**
 * 一次性迁移脚本：将notebooks表中的VOCAB类型数据迁移到user_vocab_progress
 * 
 * 迁移逻辑：
 * 1. 获取当前用户的所有VOCAB类型notebooks
 * 2. 对于每个notebook，检查words表中是否有匹配的单词
 * 3. 如果没有，创建新的word条目
 * 4. 创建对应的user_vocab_progress条目
 */
export const migrateVocabNotebooks = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        const now = Date.now();

        // 1. Get all VOCAB notebooks for this user
        const vocabNotebooks = await ctx.db
            .query("notebooks")
            .filter(q =>
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.eq(q.field("type"), "VOCAB")
                )
            )
            .collect();

        let migratedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const notebook of vocabNotebooks) {
            try {
                // Extract word from notebook
                const word = notebook.title; // Usually the word is stored as title
                const content = typeof notebook.content === 'object' ? notebook.content : {};
                const meaning = (content as any)?.meaning || (content as any)?.text || notebook.preview || '';

                if (!word) {
                    skippedCount++;
                    continue;
                }

                // 2. Check if word exists in words table
                let existingWord = await ctx.db
                    .query("words")
                    .withIndex("by_word", q => q.eq("word", word))
                    .unique();

                let wordId;
                if (existingWord) {
                    wordId = existingWord._id;
                } else {
                    // Create new word
                    wordId = await ctx.db.insert("words", {
                        word: word,
                        meaning: meaning,
                        partOfSpeech: "NOUN", // Default
                    });
                }

                // 3. Check if progress already exists
                const existingProgress = await ctx.db
                    .query("user_vocab_progress")
                    .withIndex("by_user_word", q => q.eq("userId", userId).eq("wordId", wordId))
                    .unique();

                if (existingProgress) {
                    skippedCount++;
                    continue;
                }

                // 4. Create progress entry
                await ctx.db.insert("user_vocab_progress", {
                    userId,
                    wordId,
                    status: 'NEW',
                    interval: 0.5,
                    streak: 0,
                    lastReviewedAt: now,
                    nextReviewAt: now + (12 * 60 * 60 * 1000), // 12 hours
                });

                migratedCount++;
            } catch (e: any) {
                errors.push(`${notebook.title}: ${e.message}`);
            }
        }

        return {
            success: true,
            totalNotebooks: vocabNotebooks.length,
            migrated: migratedCount,
            skipped: skippedCount,
            errors,
        };
    },
});
