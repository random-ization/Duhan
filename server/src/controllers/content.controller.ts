import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadJsonToS3, deleteFromS3, extractKeyFromUrl, sendToS3 } from '../lib/storage';
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
    const { id, name, levels, coverUrl, themeColor, publisher } = validatedData;
    const institute = await prisma.institute.create({
      data: {
        id,
        name,
        levels: JSON.stringify(levels),
        coverUrl: coverUrl || null,
        themeColor: themeColor || null,
        publisher: publisher || null,
      },
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
    const { name, levels, coverUrl, themeColor, publisher } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (levels !== undefined) updateData.levels = JSON.stringify(levels);
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl || null;
    if (themeColor !== undefined) updateData.themeColor = themeColor || null;
    if (publisher !== undefined) updateData.publisher = publisher || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const institute = await prisma.institute.update({
      where: { id },
      data: updateData,
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

/**
 * Proxy endpoint to fetch textbook content from S3 with cache controls
 * GET /api/content/textbook/:key/data
 */
export const getTextbookContentData = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    // Get content metadata from database
    const content = await prisma.textbookContent.findUnique({
      where: { key },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // If contentUrl exists, fetch from S3
    if (content.contentUrl) {
      const https = await import('https');

      // Add cache-busting parameter
      const urlWithCacheBust = `${content.contentUrl}?_t=${Date.now()}`;

      return new Promise<void>((resolve, reject) => {
        https.get(urlWithCacheBust, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }, (s3Res) => {
          if (!s3Res.statusCode || s3Res.statusCode >= 400) {
            res.status(s3Res.statusCode || 500).json({ error: 'Failed to fetch content from storage' });
            return resolve();
          }

          let data = '';
          s3Res.on('data', chunk => data += chunk);
          s3Res.on('end', () => {
            try {
              const contentData = JSON.parse(data);
              // Set cache control headers on response
              res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              });
              res.json({
                ...content,
                ...contentData,
              });
              resolve();
            } catch (parseErr) {
              res.status(500).json({ error: 'Failed to parse content data' });
              resolve();
            }
          });
        }).on('error', (err) => {
          console.error('[getTextbookContentData] S3 fetch error:', err);
          res.status(500).json({ error: 'Failed to fetch content from storage' });
          resolve();
        });
      });
    }

    // Fallback: return legacy data from database
    res.json(content);
  } catch (e: any) {
    console.error('[getTextbookContentData] Error:', e);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

export const saveContent = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveContentInput = SaveContentSchema.parse(req.body);
    const { key, ...data } = validatedData;

    // Extract content fields for S3 upload
    const contentData = {
      generalContext: data.generalContext || '',
      vocabularyList: data.vocabularyList || '',
      readingText: data.readingText || '',
      readingTranslation: data.readingTranslation || '',
      listeningScript: data.listeningScript || '',
      listeningTranslation: data.listeningTranslation || '',
      grammarList: data.grammarList || '',
    };

    // Upload content to S3
    const timestamp = Date.now();
    const s3Key = `content/textbook/${key}/${timestamp}.json`;
    const contentJson = JSON.stringify(contentData);
    const contentBuffer = Buffer.from(contentJson, 'utf-8');

    try {
      await sendToS3(s3Key, contentBuffer, 'application/json');
    } catch (s3Error: any) {
      console.error('[saveContent] S3 upload failed:', s3Error);
      return res.status(500).json({ error: 'Failed to upload content to storage', details: s3Error.message });
    }

    // Build S3 URL
    const cdnUrl = process.env.SPACES_CDN_URL || `https://${process.env.SPACES_BUCKET}.${new URL(process.env.SPACES_ENDPOINT!).host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}`;
    const contentUrl = `${cdnUrl}/${s3Key}`;

    // Save metadata to database with contentUrl
    const dbData = {
      contentUrl,
      readingTitle: data.readingTitle || null,
      listeningTitle: data.listeningTitle || null,
      listeningAudioUrl: data.listeningAudioUrl || null,
      isPaid: data.isPaid || false,
      // Clear legacy fields (data is now in S3)
      generalContext: null,
      vocabularyList: null,
      readingText: null,
      readingTranslation: null,
      listeningScript: null,
      listeningTranslation: null,
      grammarList: null,
    };

    const content = await prisma.textbookContent.upsert({
      where: { key },
      update: dbData,
      create: { key, ...dbData },
    });

    // Return the full content for frontend
    res.json({
      ...content,
      ...contentData, // Include content for immediate use
    });
  } catch (e: any) {
    console.error('[saveContent] Error:', e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save content' });
  }
};

// --- TOPIK Exam ---

/**
 * 获取考试列表
 */
export const getTopikExams = async (req: Request, res: Response) => {
  try {
    const exams = await prisma.topikExam.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Normalize data structure for frontend
    const normalizedExams = exams.map(exam => {
      const questions = exam.questions as any;
      if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
        return {
          ...exam,
          questions: null,
          questionsUrl: questions.url
        };
      }
      return exam;
    });

    res.json(normalizedExams);
  } catch (e: any) {
    console.error('[getTopikExams] Error:', e);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

/**
 * 获取单个考试详情
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

    // Handle questions format (New: { url: string } vs Old: [...])
    const questions = exam.questions as any;
    let finalExam = { ...exam };

    if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
      finalExam = {
        ...exam,
        questions: null, // Frontend will load from URL
        questionsUrl: questions.url,
      } as any;
    } else {
      // Ensure legacy format respects the type expected by frontend (no changes needed)
    }

    res.json(finalExam);
  } catch (e: any) {
    console.error('[getTopikExamById] Error:', e);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
};

/**
 * 代理获取考试题目 (避免 CORS 问题)
 * GET /content/topik/:id/questions
 */
export const getTopikExamQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.topikExam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const questions = exam.questions as any;

    // If questions is stored as URL reference, fetch from S3
    if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
      try {
        // Convert CDN URL to origin S3 URL to bypass CDN cache
        let fetchUrl = questions.url;

        // If using CDN URL, convert to origin
        if (fetchUrl.includes('.cdn.digitaloceanspaces.com')) {
          // Convert: bucket.region.cdn.digitaloceanspaces.com -> bucket.region.digitaloceanspaces.com
          fetchUrl = fetchUrl.replace('.cdn.digitaloceanspaces.com', '.digitaloceanspaces.com');
        }

        // Add cache-busting query param
        const urlWithCacheBust = `${fetchUrl}?_t=${Date.now()}`;
        console.log('[getTopikExamQuestions] Fetching from origin:', urlWithCacheBust);

        const response = await fetch(urlWithCacheBust, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });

        if (!response.ok) {
          throw new Error(`S3 fetch failed: ${response.status}`);
        }

        const questionsData = await response.json();

        // Set cache headers to prevent browser caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.json(questionsData);
      } catch (fetchError) {
        console.error('[getTopikExamQuestions] S3 fetch error:', fetchError);
        return res.status(502).json({ error: 'Failed to fetch questions from storage' });
      }
    }

    // Legacy: questions stored directly in database
    if (Array.isArray(questions)) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.json(questions);
    }

    // No questions available
    return res.json([]);
  } catch (e: any) {
    console.error('[getTopikExamQuestions] Error:', e);
    res.status(500).json({ error: 'Failed to fetch exam questions' });
  }
};

/**
 * 保存考试
 */
export const saveTopikExam = async (req: Request, res: Response) => {
  try {
    const validatedData = SaveTopikExamSchema.parse(req.body);
    const input = validatedData as any;
    const { id, questions, questionsUrl, ...data } = input;

    // Determine what to save in 'questions' column
    let questionsData: any;

    // If frontend already uploaded to S3 and provided a URL, use that
    if (questionsUrl) {
      questionsData = { url: questionsUrl };
    }
    // If questions array is provided, upload to S3 first
    else if (questions && Array.isArray(questions) && questions.length > 0) {
      try {
        console.log('[saveTopikExam] Uploading questions to S3...');

        // Use native HTTPS upload (same as uploadMedia)
        const key = `exams/${id || 'exam'}-${Date.now()}.json`;
        const jsonBuffer = Buffer.from(JSON.stringify(questions), 'utf-8');

        // Import sendToSpacesNative directly (it's in storage.ts)
        const { sendToS3 } = await import('../lib/storage');
        await sendToS3(key, jsonBuffer, 'application/json');

        const cdnUrl = process.env.SPACES_CDN_URL ||
          `https://${process.env.SPACES_BUCKET}.${new URL(process.env.SPACES_ENDPOINT || '').host.replace('digitaloceanspaces', 'cdn.digitaloceanspaces')}`;

        questionsData = { url: `${cdnUrl}/${key}` };
        console.log('[saveTopikExam] Questions uploaded to:', questionsData.url);
      } catch (uploadError) {
        console.error('[saveTopikExam] S3 upload failed, saving to DB:', uploadError);
        // Fallback: save to database directly (not ideal but works)
        questionsData = questions;
      }
    } else {
      questionsData = [];
    }

    // Check if exists to determine update or create
    const existing = await prisma.topikExam.findUnique({ where: { id } });

    let result;
    if (existing) {
      result = await prisma.topikExam.update({
        where: { id },
        data: {
          ...data,
          questions: questionsData,
        },
      });
    } else {
      result = await prisma.topikExam.create({
        data: {
          id,
          ...data,
          questions: questionsData,
        },
      });
    }

    res.json(result);
  } catch (e: any) {
    console.error('[saveTopikExam] Error:', e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save exam', details: e.message });
  }
};

/**
 * 删除考试
 */
export const deleteTopikExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.topikExam.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
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
