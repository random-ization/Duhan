import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import { checkFileExists, uploadJSON, downloadJSON } from './storage.service';

// L1 内存缓存：最大 100 条，1 小时 TTL
const cache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 * 60, // 1 hour
});

// Gemini 客户端
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

// 生成题目唯一 hash
const generateHash = (question: string, options: string[]): string => {
    const content = `${question}|${options.join('|')}`;
    return crypto.createHash('md5').update(content).digest('hex');
};

// S3 缓存路径
const getCacheKey = (hash: string): string => {
    return `ai-cache/topik/${hash}.json`;
};

export interface TopikQuestionInput {
    question: string;
    options: string[];
    correctAnswer: number;
    type?: string;
}

export interface TopikAnalysisResult {
    translation: string;
    keyPoint: string;
    analysis: string;
    wrongOptions: Record<string, string>;
    cached?: boolean;
}

/**
 * 分析 TOPIK 题目
 */
export const analyzeTopikQuestion = async (
    input: TopikQuestionInput
): Promise<TopikAnalysisResult> => {
    const { question, options, correctAnswer, type } = input;

    // Step 1: 生成 hash
    const hash = generateHash(question, options);

    // Step 2: 检查 L1 内存缓存
    const cachedResult = cache.get(hash);
    if (cachedResult) {
        console.log(`[AI] L1 cache hit: ${hash}`);
        return { ...cachedResult, cached: true };
    }

    // Step 3: 检查 L2 S3 缓存
    const s3Key = getCacheKey(hash);
    try {
        const exists = await checkFileExists(s3Key);
        if (exists) {
            console.log(`[AI] L2 (S3) cache hit: ${hash}`);
            const s3Result = await downloadJSON(s3Key);
            cache.set(hash, s3Result); // 更新 L1
            return { ...s3Result, cached: true };
        }
    } catch (e) {
        console.warn(`[AI] S3 cache check failed:`, e);
    }

    // Step 4: 调用 Gemini API
    console.log(`[AI] Cache miss, calling Gemini API for: ${hash}`);

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const optionsStr = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    const correctAnswerText = options[correctAnswer] || options[0];

    const prompt = `You are a strict Korean language exam proctor.
Analyze the following TOPIK question.

Question: ${question}
Options:
${optionsStr}
Correct Answer: ${correctAnswer + 1}. ${correctAnswerText} (Explain why this is correct)
Question Type: ${type || 'general'}

Output pure JSON with these keys:
- translation: Chinese translation of the question
- keyPoint: Key grammar or vocabulary point being tested
- analysis: Detailed explanation of why the correct answer is right
- wrongOptions: Object with keys "1", "2", "3", "4" explaining why each wrong option is incorrect (skip the correct answer)

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 解析 JSON 响应
    let analysisResult: TopikAnalysisResult;
    try {
        // 移除可能的 markdown 代码块标记
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanJson);
    } catch (e) {
        console.error('[AI] Failed to parse Gemini response:', responseText);
        throw new Error('Failed to parse AI response as JSON');
    }

    // Step 5: 保存到 S3 和 L1 缓存
    try {
        await uploadJSON(s3Key, analysisResult);
        console.log(`[AI] Saved to S3: ${s3Key}`);
    } catch (e) {
        console.warn(`[AI] Failed to save to S3:`, e);
    }

    cache.set(hash, analysisResult);

    // Step 6: 返回结果
    return { ...analysisResult, cached: false };
};
