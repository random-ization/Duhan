import { Request, Response } from 'express';
import { analyzeTopikQuestion, TopikQuestionInput } from '../services/ai.service';
import { generateTranscript, getTranscriptFromCache, analyzeSentence, deleteTranscriptCache } from '../services/transcript.service';

/**
 * POST /api/ai/analyze-question
 * 分析 TOPIK 题目
 */
export const analyzeQuestion = async (req: Request, res: Response) => {
    try {
        const { question, options, correctAnswer, type, imageUrl } = req.body;

        // 验证必填字段
        // 如果有图片，question 可以为空
        if (!imageUrl && (!question || typeof question !== 'string')) {
            return res.status(400).json({ error: 'question is required (unless imageUrl is provided) and must be a string' });
        }

        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: 'options must be an array with at least 2 items' });
        }

        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
            return res.status(400).json({ error: 'correctAnswer must be a valid index within options' });
        }

        const input: TopikQuestionInput = {
            question: question || 'The question is in the image.',
            options,
            correctAnswer,
            type: type || 'general',
            imageUrl
        };

        const result = await analyzeTopikQuestion(input);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AI Controller] Error:', error);
        if (error instanceof Error) {
            console.error('[AI Controller] Stack:', error.stack);
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: message
        });
    }
};

/**
 * POST /api/ai/analyze-sentence
 * 分析韩语句子的词汇、语法和语感
 */
export const analyzeSentenceHandler = async (req: Request, res: Response) => {
    try {
        const { sentence, context, language } = req.body;

        // Validate required field
        if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'sentence is required and must be a non-empty string'
            });
        }

        // Call analyzeSentence from transcript.service (SiliconFlow)
        const result = await analyzeSentence(sentence.trim(), context?.trim(), language || 'zh');

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AI Controller] Sentence analysis error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            success: false,
            error: message
        });
    }
};

/**
 * POST /api/ai/transcript
 * Generate AI transcript for podcast episode
 */
export const generateTranscriptHandler = async (req: Request, res: Response) => {
    try {
        const { audioUrl, episodeId, language } = req.body;

        // Validate required fields
        if (!audioUrl || typeof audioUrl !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'audioUrl is required and must be a string'
            });
        }

        if (!episodeId || typeof episodeId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'episodeId is required and must be a string'
            });
        }

        console.log(`[AI Controller] Generating transcript for: ${episodeId}`);

        const result = await generateTranscript(audioUrl, episodeId, language || 'zh');

        return res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[AI Controller] Transcript generation error:', error);

        // Handle specific error types
        const errorCode = error.message;
        let statusCode = 500;
        let userMessage = 'Failed to generate transcript';

        if (errorCode === 'AUDIO_DOWNLOAD_FAILED') {
            statusCode = 400;
            userMessage = 'Failed to download audio file';
        } else if (errorCode === 'TRANSCRIPT_PARSE_FAILED') {
            statusCode = 500;
            userMessage = 'Failed to parse AI response';
        }

        return res.status(statusCode).json({
            success: false,
            error: userMessage,
            code: errorCode
        });
    }
};

/**
 * GET /api/ai/transcript/:episodeId
 * Check if transcript exists in cache
 */
export const checkTranscriptHandler = async (req: Request, res: Response) => {
    try {
        const { episodeId } = req.params;

        if (!episodeId) {
            return res.status(400).json({
                success: false,
                error: 'episodeId is required'
            });
        }

        const cached = await getTranscriptFromCache(episodeId);

        if (cached) {
            return res.json({
                success: true,
                exists: true,
                data: cached
            });
        } else {
            return res.json({
                success: true,
                exists: false
            });
        }
    } catch (error) {
        console.error('[AI Controller] Check transcript error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to check transcript'
        });
    }
};

/**
 * DELETE /api/ai/transcript/:episodeId
 * Delete transcript from cache
 */
export const deleteTranscriptHandler = async (req: Request, res: Response) => {
    try {
        const { episodeId } = req.params;

        if (!episodeId) {
            return res.status(400).json({
                success: false,
                error: 'episodeId is required'
            });
        }

        console.log(`[AI Controller] Deleting transcript cache for: ${episodeId}`);
        await deleteTranscriptCache(episodeId);

        return res.json({
            success: true,
            message: 'Transcript cache deleted'
        });
    } catch (error) {
        console.error('[AI Controller] Delete transcript error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete transcript cache'
        });
    }
};
