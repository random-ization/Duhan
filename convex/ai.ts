"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

// Helper: Delete transcript (action since "use node" requires actions only)
export const deleteTranscript = action({
    args: { episodeId: v.string() },
    handler: async (_ctx, _args) => {
        // Currently a no-op as transcripts are cached on frontend/S3
        // If stored in DB, would need to call an internal mutation
        return { success: true };
    }
});

// Helper: Generate Transcript Stub
export const generateTranscript = action({
    args: {
        audioUrl: v.string(),
        episodeId: v.string(),
        language: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        console.log("Generating transcript for:", args.audioUrl);

        // Stub implementation: Return Mock Transcript
        // In real prod, this would call Whisper via OpenAI or Deepgram

        await new Promise(resolve => setTimeout(resolve, 2000)); // Fake delay

        const mockSegments = [
            { start: 0, end: 4.5, text: "안녕하세요, 여러분. 오늘도 한국어 공부 시작해볼까요?", translation: "大家好，今天也开始学习韩语吗？" },
            { start: 4.5, end: 8.2, text: "꾸준히 하는 것이 가장 중요합니다.", translation: "坚持是最重要的。" },
            { start: 8.2, end: 12.0, text: "이 문장은 조금 빠르니까 다시 들어보세요.", translation: "这句话有点快，请再听一遍。" },
            { start: 12.0, end: 16.5, text: "오늘은 일상 대화에서 많이 쓰는 표현을 배워볼 거예요.", translation: "今天我们来学习日常对话中常用的表达。" },
            { start: 16.5, end: 21.0, text: "예를 들어, '어떻게 지내세요?'라는 표현이 있어요.", translation: "比如，有'您最近怎么样？'这样的表达。" },
        ];

        return {
            success: true,
            data: {
                segments: mockSegments
            }
        };
    }
});

export const analyzeText = action({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn("OPENAI_API_KEY not set");
            return null;
        }

        const client = new OpenAI({ apiKey });

        // Skip analysis for very short texts
        if (!args.text || args.text.trim().length < 10) {
            return null;
        }

        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a Korean linguistics expert. Analyze the provided text for language learners.

Task: Perform morphological analysis (Lemmatization).
1. Break down the text into meaningful tokens (words, particles, endings).
2. For verbs/adjectives, identify their dictionary base form (Lemma).
3. Calculate the precise 'offset' (0-based start index) and 'length' of each token in the original string.

IMPORTANT: 
- Be precise with offset calculations - count exact character positions
- Include spaces in your offset calculations
- Only return tokens that are meaningful for language learning (skip punctuation, spaces)

Return a JSON object with a "tokens" key containing an array of:
{ 
  "surface": string (the exact word in text, e.g., "갔습니다"), 
  "base": string (dictionary form, e.g., "가다"), 
  "offset": number (0-based index), 
  "length": number (character length of surface form), 
  "pos": string (e.g., "Verb", "Noun", "Adjective", "Particle", "Adverb", "Pronoun", "Number", "Determiner") 
}`,
                    },
                    { role: "user", content: args.text },
                ],
                response_format: { type: "json_object" },
                temperature: 0,
                max_tokens: 4000,
            });

            const content = completion.choices[0].message.content;
            if (!content) return null;

            const result = JSON.parse(content);
            return { tokens: result.tokens || [], tokenCount: (result.tokens || []).length };
        } catch (error) {
            console.error("Text analysis failed:", error);
            return null;
        }
    },
});

// Analyze a Korean sentence for vocabulary and grammar
export const analyzeSentence = action({
    args: {
        sentence: v.string(),
        context: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn("OPENAI_API_KEY not set");
            return null;
        }

        const client = new OpenAI({ apiKey });

        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a Korean language teacher. Analyze the given sentence for a language learner.

Return a JSON object with:
{
  "vocabulary": [{ "word": string, "root": string, "meaning": string, "type": string }],
  "grammar": [{ "structure": string, "explanation": string }],
  "nuance": string (cultural or contextual notes)
}`,
                    },
                    { role: "user", content: args.sentence + (args.context ? `\n\nContext: ${args.context}` : "") },
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });

            const content = completion.choices[0].message.content;
            if (!content) return null;

            const result = JSON.parse(content);
            return { success: true, data: result };
        } catch (error) {
            console.error("Sentence analysis failed:", error);
            return { success: false, data: null };
        }
    },
});

// Analyze TOPIK question (for study mode)
export const analyzeQuestion = action({
    args: {
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        type: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return null;

        const client = new OpenAI({ apiKey });

        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `你是一位TOPIK考试辅导老师。请用中文为学生分析这道题目。

请返回JSON格式：
{
  "translation": string (题目的中文翻译),
  "keyPoint": string (这道题考察的知识点),
  "analysis": string (详细解析，为什么正确答案是对的),
  "wrongOptions": { "1": string, "2": string, ... } (分析每个错误选项为什么是错的)
}

注意：所有内容必须用中文回答。`,
                    },
                    { role: "user", content: `Question: ${args.question}\nOptions: ${args.options.join(', ')}\nCorrect: ${args.correctAnswer + 1}` },
                ],
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) return null;

            return { success: true, data: JSON.parse(content) };
        } catch (error) {
            console.error("Question analysis failed:", error);
            return { success: false, data: null };
        }
    },
});
