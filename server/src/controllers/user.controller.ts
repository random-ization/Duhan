import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { isZodError } from '../lib/errors';
import bcrypt from 'bcryptjs';
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
  UpdateProfileSchema,
  UpdateProfileInput,
  ChangePasswordSchema,
  ChangePasswordInput,
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
  } catch (e: unknown) {
    console.error('Save Word Error', e);
    if (isZodError(e)) {
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
  } catch (e: unknown) {
    if (isZodError(e)) {
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
  } catch (e: unknown) {
    console.error(e);
    if (isZodError(e)) {
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
  } catch (e: unknown) {
    console.error(e);
    if (isZodError(e)) {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save exam result' });
  }
};

// Log Learning Activity
export const deleteExamAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify ownership
    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
    });

    if (!attempt || attempt.userId !== userId) {
      // If not found or not owned by user, return 404
      return res.status(404).json({ error: 'Attempt not found' });
    }

    await prisma.examAttempt.delete({
      where: { id },
    });

    res.json({ success: true, id });
  } catch (e: unknown) {
    console.error('Delete Exam Attempt Error', e);
    res.status(500).json({ error: 'Failed to delete exam attempt' });
  }
};

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
        // Cast to InputJsonValue for Prisma compatibility
        metadata: (metadata ?? null) as any,
        date: today,
      },
    });

    res.json(activity);
  } catch (e: unknown) {
    console.error('Log Activity Error:', e);
    if (isZodError(e)) {
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
  } catch (e: unknown) {
    console.error('Update Learning Progress Error:', e);
    if (isZodError(e)) {
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
// 更新个人资料 (修改名字)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData: UpdateProfileInput = UpdateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...validatedData },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (e: unknown) {
    if (isZodError(e)) {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// 修改密码
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData: ChangePasswordInput = ChangePasswordSchema.parse(req.body);
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = validatedData;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true });
  } catch (e: unknown) {
    if (isZodError(e)) {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Get User Stats for Dashboard
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const dailyGoal = 30; // Default 30 minutes daily goal

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
    startOfWeek.setDate(today.getDate() - diff);

    // 1. Calculate streak - count consecutive days with activity
    const allActivities = await prisma.learningActivity.findMany({
      where: { userId },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    // Get unique dates
    const uniqueDates = [...new Set(allActivities.map(a => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))].sort((a, b) => b - a); // Sort descending

    let streak = 0;
    const todayTime = today.getTime();
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;

    // Check if user was active today or yesterday (to not break streak mid-day)
    if (uniqueDates.length > 0 && (uniqueDates[0] === todayTime || uniqueDates[0] === yesterdayTime)) {
      streak = 1;
      let expectedDate = uniqueDates[0] - 24 * 60 * 60 * 1000;

      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === expectedDate) {
          streak++;
          expectedDate -= 24 * 60 * 60 * 1000;
        } else {
          break;
        }
      }
    }

    // 2. Get weekly learning minutes (Mon-Sun)
    const weekActivities = await prisma.learningActivity.findMany({
      where: {
        userId,
        date: { gte: startOfWeek },
      },
      select: { date: true, duration: true },
    });

    const weeklyMinutes = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    weekActivities.forEach(activity => {
      const activityDate = new Date(activity.date);
      let dayIndex = activityDate.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6; // Sunday
      weeklyMinutes[dayIndex] += activity.duration || 0;
    });

    // 3. Get today's activities and calculate daily minutes
    const todayActivities = await prisma.learningActivity.findMany({
      where: {
        userId,
        date: today,
      },
    });

    let dailyMinutes = 0;
    const todayStats = {
      wordsLearned: 0,
      readingsCompleted: 0,
      listeningsCompleted: 0,
    };

    todayActivities.forEach(activity => {
      dailyMinutes += activity.duration || 0;
      if (activity.activityType === 'VOCAB') {
        todayStats.wordsLearned += activity.itemsStudied || 0;
      } else if (activity.activityType === 'READING') {
        todayStats.readingsCompleted += 1;
      } else if (activity.activityType === 'LISTENING') {
        todayStats.listeningsCompleted += 1;
      }
    });

    // 4. Get course progress data
    const courseProgress = await prisma.userCourseProgress.findMany({
      where: { userId },
      include: {
        course: {
          select: { id: true, name: true, totalUnits: true }
        }
      }
    });

    const courseProgressData = courseProgress.map(cp => ({
      courseId: cp.courseId,
      courseName: cp.course.name,
      completedUnits: cp.completedUnits.length,
      totalUnits: cp.course.totalUnits || 10,
      lastAccessAt: cp.lastAccessAt,
    }));

    res.json({
      streak,
      weeklyMinutes,
      dailyMinutes,
      dailyGoal,
      dailyProgress: Math.min(100, Math.round((dailyMinutes / dailyGoal) * 100)),
      todayActivities: todayStats,
      courseProgress: courseProgressData,
    });
  } catch (e: unknown) {
    console.error('Get User Stats Error:', e);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
};

// Complete a unit (mark as completed)
export const completeUnit = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { courseId, unitIndex } = req.body;

    if (!courseId || unitIndex === undefined) {
      return res.status(400).json({ error: 'courseId and unitIndex are required' });
    }

    // Find or create progress record
    let progress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (progress) {
      // Add unit to completedUnits if not already there
      const currentUnits = progress.completedUnits || [];
      if (!currentUnits.includes(unitIndex)) {
        progress = await prisma.userCourseProgress.update({
          where: { id: progress.id },
          data: {
            completedUnits: [...currentUnits, unitIndex],
            lastAccessAt: new Date()
          }
        });
      } else {
        // Just update lastAccessAt
        progress = await prisma.userCourseProgress.update({
          where: { id: progress.id },
          data: { lastAccessAt: new Date() }
        });
      }
    } else {
      // Create new progress record
      progress = await prisma.userCourseProgress.create({
        data: {
          userId,
          courseId,
          completedUnits: [unitIndex],
          lastAccessAt: new Date()
        }
      });
    }

    // Get course for total units
    const course = await prisma.institute.findUnique({
      where: { id: courseId },
      select: { totalUnits: true }
    });

    res.json({
      success: true,
      data: {
        courseId,
        completedUnits: progress.completedUnits,
        completedCount: progress.completedUnits.length,
        totalUnits: course?.totalUnits || 10
      }
    });
  } catch (e: unknown) {
    console.error('Complete Unit Error:', e);
    res.status(500).json({ error: 'Failed to complete unit' });
  }
};

// Get course progress for a specific course
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { courseId } = req.params;

    const progress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: { select: { name: true, totalUnits: true } }
      }
    });

    if (!progress) {
      // No progress yet, return empty
      const course = await prisma.institute.findUnique({
        where: { id: courseId },
        select: { name: true, totalUnits: true }
      });

      return res.json({
        success: true,
        data: {
          courseId,
          courseName: course?.name || '',
          completedUnits: [],
          completedCount: 0,
          totalUnits: course?.totalUnits || 10,
          progressPercent: 0
        }
      });
    }

    const totalUnits = progress.course.totalUnits || 10;
    const completedCount = progress.completedUnits.length;

    res.json({
      success: true,
      data: {
        courseId,
        courseName: progress.course.name,
        completedUnits: progress.completedUnits,
        completedCount,
        totalUnits,
        progressPercent: Math.round((completedCount / totalUnits) * 100),
        lastAccessAt: progress.lastAccessAt
      }
    });
  } catch (e: unknown) {
    console.error('Get Course Progress Error:', e);
    res.status(500).json({ error: 'Failed to get course progress' });
  }
};

// Get My Stats (for Learner Dashboard - uses user.service.ts)
import * as userService from '../services/user.service';

export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [dashboardStats, currentProgress] = await Promise.all([
      userService.getUserDashboardStats(userId),
      userService.getCurrentProgress(userId)
    ]);

    return res.json({
      success: true,
      data: {
        ...dashboardStats,
        currentProgress
      }
    });
  } catch (e: unknown) {
    console.error('Get My Stats Error:', e);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
};
