import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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
export const getTopikExams = async (req: Request, res: Response) => {
  try {
    const exams = await prisma.topikExam.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Prisma automatically handles Json type - questions is already an object
    res.json(exams);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

export const saveTopikExam = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: SaveTopikExamInput = SaveTopikExamSchema.parse(req.body);
    const { id, questions, ...data } = validatedData;

    // Check if exists to determine update or create (or use upsert if ID is reliable)
    const existing = await prisma.topikExam.findUnique({ where: { id } });

    if (existing) {
      const updated = await prisma.topikExam.update({
        where: { id },
        data: {
          ...data,
          // Prisma automatically handles Json type - no need to stringify
          questions,
        },
      });
      res.json(updated);
    } else {
      const created = await prisma.topikExam.create({
        data: {
          id, // Allow client-side ID generation for simplicity or omit to auto-gen
          ...data,
          // Prisma automatically handles Json type - no need to stringify
          questions,
        },
      });
      res.json(created);
    }
  } catch (e: any) {
    console.error(e);
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: e.errors });
    }
    res.status(500).json({ error: 'Failed to save exam' });
  }
};

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
            return res.status(400).json({ error: "Invalid document type" });
        }
        
        const document = await prisma.legalDocument.findUnique({
            where: { id: type }
        });
        
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        res.json({
            id: document.id,
            title: document.title,
            content: document.content,
            updatedAt: document.updatedAt.getTime()
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch legal document" });
    }
};

export const saveLegalDocument = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const { title, content } = req.body;
        
        // Validate type
        if (!['terms', 'privacy', 'refund'].includes(type)) {
            return res.status(400).json({ error: "Invalid document type" });
        }
        
        // Validate input
        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required" });
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
                updatedBy: userId
            },
            create: {
                id: type,
                title,
                content,
                updatedBy: userId
            }
        });
        
        res.json({
            id: document.id,
            title: document.title,
            content: document.content,
            updatedAt: document.updatedAt.getTime()
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Failed to save legal document" });
    }
};
