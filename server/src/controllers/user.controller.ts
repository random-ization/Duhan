
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

// Save a Vocabulary Word
export const saveWord = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { korean, english, pos, exampleSentence, exampleTranslation, unit } = req.body;

        // Check if word already saved to avoid duplicates (optional, based on preference)
        // For now, we allow multiples or user handles clean up
        const word = await prisma.savedWord.create({
            data: { 
                userId, 
                korean, 
                english, 
                pos: pos || null, 
                exampleSentence: exampleSentence || '', 
                exampleTranslation: exampleTranslation || '', 
                unit: unit ? Number(unit) : null
            }
        });
        res.json(word);
    } catch (e) {
        console.error("Save Word Error", e);
        res.status(500).json({ error: "Failed to save word" });
    }
};

// Save a Mistake
export const saveMistake = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { korean, english } = req.body;

        // Prevent exact duplicates for mistakes to keep list clean
        const existing = await prisma.mistake.findFirst({
            where: { userId, korean, english }
        });

        if (existing) {
            return res.json(existing);
        }

        const mistake = await prisma.mistake.create({
            data: { userId, korean, english }
        });
        res.json(mistake);
    } catch (e) {
        res.status(500).json({ error: "Failed to save mistake" });
    }
};

// Save Annotation (Highlight or Note)
export const saveAnnotation = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { id, contextKey, startOffset, endOffset, sentenceIndex, text, color, note } = req.body;

        // Check if annotation exists for this ID and user
        const existing = await prisma.annotation.findFirst({ where: { id, userId } });

        if (existing) {
            // If clearing both color and note, delete the annotation completely
            if (!color && (!note || note.trim() === '')) {
                await prisma.annotation.delete({ where: { id: existing.id } });
                return res.json({ deleted: true, id: existing.id });
            }
            // Otherwise Update
            const updated = await prisma.annotation.update({
                where: { id: existing.id },
                data: { color, note, text } // text might be updated if range adjusted slightly
            });
            return res.json(updated);
        }

        // Create new annotation
        // If color is null and note is empty, don't create garbage
        if (!color && (!note || note.trim() === '')) {
            return res.json({ deleted: true });
        }

        const created = await prisma.annotation.create({
            data: { 
                id: id || Date.now().toString(), 
                userId, 
                contextKey, 
                startOffset, 
                endOffset, 
                sentenceIndex,
                text, 
                color, 
                note 
            }
        });
        res.json(created);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to save annotation" });
    }
};

// Save Exam Attempt
export const saveExamAttempt = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { id, examId, examTitle, score, maxScore, userAnswers, timestamp } = req.body;

        const attempt = await prisma.examAttempt.create({
            data: {
                id: id || Date.now().toString(),
                userId,
                examId,
                examTitle,
                score,
                maxScore,
                // Prisma Schema defines this as String, so we must stringify the JSON object
                userAnswers: JSON.stringify(userAnswers),
                timestamp: timestamp ? new Date(timestamp) : new Date()
            }
        });
        res.json(attempt);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to save exam result" });
    }
};

// Log Learning Activity
export const logActivity = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { activityType, duration, itemsStudied, metadata } = req.body;

        if (!activityType) {
            return res.status(400).json({ error: "Activity type is required" });
        }

        // Get today's date at midnight for consistent day tracking
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activity = await prisma.learningActivity.create({
            data: {
                userId,
                activityType,
                duration: duration || null,
                itemsStudied: itemsStudied || null,
                metadata: metadata ? JSON.stringify(metadata) : null,
                date: today
            }
        });

        res.json(activity);
    } catch (e) {
        console.error("Log Activity Error:", e);
        res.status(500).json({ error: "Failed to log activity" });
    }
};

// Update Learning Progress
export const updateLearningProgress = async (req: any, res: any) => {
    try {
        const userId = req.user!.userId;
        const { lastInstitute, lastLevel, lastUnit, lastModule } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                lastInstitute,
                lastLevel,
                lastUnit,
                lastModule
            }
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Update Learning Progress Error:", e);
        res.status(500).json({ error: "Failed to update learning progress" });
    }
};
