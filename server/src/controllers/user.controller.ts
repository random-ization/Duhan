import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import {
  SaveWordSchema,
  SaveWordInput,
  SaveMistakeSchema,
  SaveMistakeInput,
  SaveAnnotationSchema,
  SaveAnnotationInput,
  SaveExamAttemptSchema,
  SaveExamAttemptInput,
  LogActivitySchema,
  LogActivityInput,
  UpdateLearningProgressSchema,
  UpdateLearningProgressInput,
} from '../schemas/validation';

// Save a Vocabulary Word
export const saveWord = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveWordInput = SaveWordSchema.parse(req.body);

    const userId = req.user!.userId;
    const { korean, english, pos, exampleSentence, exampleTranslation, unit } = validatedData;

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
        unit: unit ? Number(unit) : null,
      },
    });
    res.json(word);
  } catch (e: any) {
    console.error('Save Word Error', e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save word' });
  }
};

// Save a Mistake
export const saveMistake = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveMistakeInput = SaveMistakeSchema.parse(req.body);

    const userId = req.user!.userId;
    const { korean, english } = validatedData;

    // Prevent exact duplicates for mistakes to keep list clean
    const existing = await prisma.mistake.findFirst({
      where: { userId, korean, english },
    });

    if (existing) {
      return res.json(existing);
    }

    const mistake = await prisma.mistake.create({
      data: { userId, korean, english },
    });
    res.json(mistake);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save mistake' });
  }
};

// Save Annotation (Highlight or Note)
export const saveAnnotation = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveAnnotationInput = SaveAnnotationSchema.parse(req.body);

    const userId = req.user!.userId;
    const { id, contextKey, startOffset, endOffset, sentenceIndex, text, color, note } =
      validatedData;

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
        data: { color, note, text }, // text might be updated if range adjusted slightly
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
        note,
      },
    });
    res.json(created);
  } catch (e: any) {
    console.error(e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save annotation' });
  }
};

// Save Exam Attempt
export const saveExamAttempt = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveExamAttemptInput = SaveExamAttemptSchema.parse(req.body);

    const userId = req.user!.userId;
    const { id, examId, examTitle, score, maxScore, userAnswers, timestamp } = validatedData;

    const attempt = await prisma.examAttempt.create({
      data: {
        id: id || Date.now().toString(),
        userId,
        examId,
        examTitle,
        score,
        maxScore,
        // Prisma automatically handles Json type - no need to stringify
        userAnswers: userAnswers as Record<string, number>,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });
    res.json(attempt);
  } catch (e: any) {
    console.error(e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save exam result' });
  }
};

// Log Learning Activity
export const logActivity = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: LogActivityInput = LogActivitySchema.parse(req.body);

    const userId = req.user!.userId;
    const { activityType, duration, itemsStudied, metadata } = validatedData;

    // Get today's date at midnight for consistent day tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activity = await prisma.learningActivity.create({
      data: {
        userId,
        activityType,
        duration: duration || null,
        itemsStudied: itemsStudied || null,
        // Prisma automatically handles Json type - no need to stringify
        metadata: metadata ?? undefined,
        date: today,
      },
    });

    res.json(activity);
  } catch (e: any) {
    console.error('Log Activity Error:', e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to log activity' });
  }
};

// Update Learning Progress
export const updateLearningProgress = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validatedData: UpdateLearningProgressInput = UpdateLearningProgressSchema.parse(req.body);

    const userId = req.user!.userId;
    const { lastInstitute, lastLevel, lastUnit, lastModule } = validatedData;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        lastInstitute,
        lastLevel,
        lastUnit,
        lastModule,
      },
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('Update Learning Progress Error:', e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to update learning progress' });
  }
};
export const updateProfileAvatar = async (req: AuthRequest, res: Response) => {
  try {
    // 1. 检查是否有文件被 Multer 中间件处理过
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 2. 获取 Spaces 返回的文件信息 (Multer-S3 会把 URL 放在 location 字段)
    const fileData = req.file as any;
    const avatarUrl = fileData.location;

    // 3. 获取当前登录用户的 ID
    const userId = req.user!.userId;

    // 4. 将新的头像 URL 更新到数据库
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    // 5. 返回更新后的头像 URL 给前端
    res.json({ avatarUrl: user.avatar });
  } catch (e) {
    console.error('Avatar update failed', e);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};

