
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// --- Institute ---
export const getInstitutes = async (req: any, res: any) => {
    try {
        const institutes = await prisma.institute.findMany();
        const formatted = institutes.map(i => ({
            ...i,
            levels: JSON.parse(i.levels)
        }));
        res.json(formatted);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch institutes" });
    }
};

export const createInstitute = async (req: any, res: any) => {
    try {
        const { id, name, levels } = req.body;
        const institute = await prisma.institute.create({
            data: { id, name, levels: JSON.stringify(levels) }
        });
        res.json({ ...institute, levels: JSON.parse(institute.levels) });
    } catch (e) {
        res.status(500).json({ error: "Failed to create institute" });
    }
};

// --- Textbook Content ---
export const getContent = async (req: any, res: any) => {
    try {
        const content = await prisma.textbookContent.findMany();
        // Return map keyed by ID
        const map: Record<string, any> = {};
        content.forEach(c => {
            map[c.key] = c;
        });
        res.json(map);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch content" });
    }
};

export const saveContent = async (req: any, res: any) => {
    try {
        const { key, ...data } = req.body;
        const content = await prisma.textbookContent.upsert({
            where: { key },
            update: data,
            create: { key, ...data }
        });
        res.json(content);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to save content" });
    }
};

// --- TOPIK Exam ---
export const getTopikExams = async (req: any, res: any) => {
    try {
        const exams = await prisma.topikExam.findMany({
            orderBy: { createdAt: 'desc' }
        });
        // Prisma automatically handles Json type - questions is already an object
        res.json(exams);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch exams" });
    }
};

export const saveTopikExam = async (req: any, res: any) => {
    try {
        const { id, questions, ...data } = req.body;
        
        // Check if exists to determine update or create (or use upsert if ID is reliable)
        const existing = await prisma.topikExam.findUnique({ where: { id } });

        if (existing) {
            const updated = await prisma.topikExam.update({
                where: { id },
                data: {
                    ...data,
                    // Prisma automatically handles Json type - no need to stringify
                    questions
                }
            });
            res.json(updated);
        } else {
            const created = await prisma.topikExam.create({
                data: {
                    id, // Allow client-side ID generation for simplicity or omit to auto-gen
                    ...data,
                    // Prisma automatically handles Json type - no need to stringify
                    questions
                }
            });
            res.json(created);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to save exam" });
    }
};

export const deleteTopikExam = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        await prisma.topikExam.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete exam" });
    }
};
