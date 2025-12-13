import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadJsonToS3, deleteFromS3, extractKeyFromUrl } from '../lib/storage';
import {
  CreateInstituteSchema,
  CreateInstituteInput,
  SaveContentSchema,
  SaveContentInput,
  SaveTopikExamSchema,
  SaveTopikExamInput,
} from '../schemas/validation';

// --- Institute ---
export const getInstitutes = async (req: Request, res: Response) => {
  try {
    const institutes = await prisma.institute.findMany();
    const formatted = institutes.map(i => ({
      ...i,
      levels: JSON.parse(i.levels),
    }));
    res.json(formatted);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch institutes' });
  }
};

export const createInstitute = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: CreateInstituteInput = CreateInstituteSchema.parse(req.body);
    const { id, name, levels } = validatedData;
    const institute = await prisma.institute.create({
      data: { id, name, levels: JSON.stringify(levels) },
    });
    res.json({ ...institute, levels: JSON.parse(institute.levels) });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to create institute' });
  }
};

export const updateInstitute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const institute = await prisma.institute.update({
      where: { id },
      data: { name },
    });
    res.json({ ...institute, levels: JSON.parse(institute.levels) });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update institute' });
  }
};

export const deleteInstitute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.institute.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to delete institute' });
  }
};

// --- Textbook Content ---
export const getContent = async (req: Request, res: Response) => {
  try {
    const content = await prisma.textbookContent.findMany();
    // Return map keyed by ID
    const map: Record<string, any> = {};
    content.forEach(c => {
      map[c.key] = c;
    });
    res.json(map);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

export const saveContent = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveContentInput = SaveContentSchema.parse(req.body);
    const { key, ...data } = validatedData;
    const content = await prisma.textbookContent.upsert({
      where: { key },
      update: data,
      create: { key, ...data },
    });
    res.json(content);
  } catch (e: any) {
    console.error(e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save content' });
  }
};

// --- TOPIK Exam ---

/**
 * 获取考试列表 (不包含 questions，减少流量)
 */
export const getTopikExams = async (req: Request, res: Response) => {
  try {
    // 使用 select 排除 questions 字段，大幅减少数据传输
    const exams = await prisma.topikExam.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        round: true,
        type: true,
        paperType: true,
        timeLimit: true,
        audioUrl: true,
        description: true,
        createdAt: true,
        isPaid: true,
        // questions 字段不查询！由前端按需从 CDN 获取
        // 但我们需要返回 questionsUrl 供前端获取
        questions: true, // 这里只取 URL 对象
      },
    });

    // 处理返回数据：如果 questions 是 { url: "..." } 格式，提取出来
    const formattedExams = exams.map(exam => {
      const questions = exam.questions as any;

      // 检查是否为 URL 引用格式
      if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
        return {
          ...exam,
          questions: null, // 列表页不返回题目数据
          questionsUrl: questions.url, // 返回 CDN URL
          hasQuestions: true,
        };
      }

      // 兼容旧数据：直接返回完整题目（过渡期间）
      return {
        ...exam,
        questionsUrl: null,
        hasQuestions: Array.isArray(questions) && questions.length > 0,
      };
    });

    res.json(formattedExams);
  } catch (e: any) {
    console.error('[getTopikExams] Error:', e);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

/**
 * 获取单个考试详情（包含完整 questions，用于编辑器）
 */
export const getTopikExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.topikExam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const questions = exam.questions as any;

    // 如果 questions 是 URL 引用格式，需要通知前端从 CDN 获取
    if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
      return res.json({
        ...exam,
        questions: null,
        questionsUrl: questions.url,
      });
    }

    // 兼容旧数据：直接返回完整题目
    res.json(exam);
  } catch (e: any) {
    console.error('[getTopikExamById] Error:', e);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
};

/**
 * 保存考试 (将 questions 上传到 S3)
 */
export const saveTopikExam = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveTopikExamInput = SaveTopikExamSchema.parse(req.body);
    const { id, questions, ...data } = validatedData;

    // 生成 S3 key：exams/{examId}/{timestamp}.json
    const timestamp = Date.now();
    const s3Key = `exams/${id}/${timestamp}.json`;

    console.log(`[saveTopikExam] Uploading questions to S3: ${s3Key}`);

    // 上传 questions JSON 到 S3
    const uploadResult = await uploadJsonToS3(questions, s3Key);
    console.log(`[saveTopikExam] Upload success: ${uploadResult.url}`);

    // 在数据库中只存储 URL 引用
    const questionsRef = {
      url: uploadResult.url,
      key: uploadResult.key,
      uploadedAt: new Date().toISOString(),
    };

    // 检查是否存在旧记录，如果有则删除旧的 S3 文件
    const existing = await prisma.topikExam.findUnique({ where: { id } });
    if (existing) {
      const oldQuestions = existing.questions as any;
      if (oldQuestions?.key) {
        try {
          console.log(`[saveTopikExam] Deleting old S3 file: ${oldQuestions.key}`);
          await deleteFromS3(oldQuestions.key);
        } catch (deleteError) {
          console.warn(`[saveTopikExam] Failed to delete old file (non-fatal):`, deleteError);
        }
      }
    }

    let result;
    if (existing) {
      result = await prisma.topikExam.update({
        where: { id },
        data: {
          ...data,
          questions: questionsRef, // 存储 URL 引用而非完整数据
        },
      });
    } else {
      result = await prisma.topikExam.create({
        data: {
          id,
          ...data,
          questions: questionsRef, // 存储 URL 引用而非完整数据
        },
      });
    }

    // 返回时把 questions 替换回完整数据供前端使用
    res.json({
      ...result,
      questions, // 返回原始题目数据
      questionsUrl: uploadResult.url, // 同时返回 CDN URL
    });
  } catch (e: any) {
    console.error('[saveTopikExam] Error:', e);
    if (e.name === 'ZodError') {
      console.error('[saveTopikExam] Zod validation errors:', JSON.stringify(e.errors, null, 2));
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save exam' });
  }
};

/**
 * 删除考试 (同时删除 S3 文件)
 */
export const deleteTopikExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 先获取记录以便删除 S3 文件
    const exam = await prisma.topikExam.findUnique({ where: { id } });
    if (exam) {
      const questions = exam.questions as any;
      if (questions?.key) {
        try {
          console.log(`[deleteTopikExam] Deleting S3 file: ${questions.key}`);
          await deleteFromS3(questions.key);
        } catch (deleteError) {
          console.warn(`[deleteTopikExam] Failed to delete S3 file (non-fatal):`, deleteError);
        }
      }
    }

    await prisma.topikExam.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('[deleteTopikExam] Error:', e);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};

// --- Legal Documents ---
export const getLegalDocument = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate type
    if (!['terms', 'privacy', 'refund'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const document = await prisma.legalDocument.findUnique({
      where: { id: type },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: document.id,
      title: document.title,
      content: document.content,
      updatedAt: document.updatedAt.getTime(),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch legal document' });
  }
};

export const saveLegalDocument = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { title, content } = req.body;

    // Validate type
    if (!['terms', 'privacy', 'refund'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Get user ID from authenticated request
    const userId = (req as any).user?.userId;

    // Upsert the document
    const document = await prisma.legalDocument.upsert({
      where: { id: type },
      update: {
        title,
        content,
        updatedAt: new Date(),
        updatedBy: userId,
      },
      create: {
        id: type,
        title,
        content,
        updatedBy: userId,
      },
    });

    res.json({
      id: document.id,
      title: document.title,
      content: document.content,
      updatedAt: document.updatedAt.getTime(),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save legal document' });
  }
};
