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

// 生成题目唯一 hash（包含语言以区分不同语言的缓存）
const generateHash = (question: string, options: string[], language: string): string => {
    const content = `${question}|${options.join('|')}|${language}`;
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
    language?: string; // 'zh' | 'ko' | 'en'
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
    const { question, options, correctAnswer, type, language = 'zh' } = input;

    // Language mapping for prompt
    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'ko': 'Korean',
        'en': 'English',
        'vi': 'Vietnamese',
        'mn': 'Mongolian'
    };

    // Step 1: 生成 hash（包含语言）
    const hash = generateHash(question, options, language);

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
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const optionsStr = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    const correctAnswerText = options[correctAnswer] || options[0];

    const prompt = `You are a strict Korean language exam proctor.
Analyze the following TOPIK question.

Question: ${question}
Options:
${optionsStr}
Correct Answer: ${correctAnswer + 1}. ${correctAnswerText} (Explain why this is correct)
Question Type: ${type || 'general'}

IMPORTANT: All your output MUST be in ${languageNames[language] || 'Chinese (Simplified)'}.

Output pure JSON with these keys:
- translation: Translation of the question into ${languageNames[language] || 'Chinese'}
- keyPoint: Key grammar or vocabulary point being tested
- analysis: Detailed explanation of why the correct answer is right
- wrongOptions: Object with keys "1", "2", "3", "4" explaining why each wrong option is incorrect (skip the correct answer)

IMPORTANT: Return ONLY valid JSON, no markdown formatting. All text values must be in ${languageNames[language] || 'Chinese'}.`;

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
        console.error('[AI] Parse error:', e);
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
