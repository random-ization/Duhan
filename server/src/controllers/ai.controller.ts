import { Request, Response } from 'express';
import { analyzeTopikQuestion, TopikQuestionInput } from '../services/ai.service';

/**
 * POST /api/ai/analyze-question
 * 分析 TOPIK 题目
 */
export const analyzeQuestion = async (req: Request, res: Response) => {
    try {
        const { question, options, correctAnswer, type } = req.body;

        // 验证必填字段
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'question is required and must be a string' });
        }

        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: 'options must be an array with at least 2 items' });
        }

        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
            return res.status(400).json({ error: 'correctAnswer must be a valid index within options' });
        }

        const input: TopikQuestionInput = {
            question,
            options,
            correctAnswer,
            type: type || 'general'
        };

        const result = await analyzeTopikQuestion(input);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AI Controller] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: message
        });
    }
};
