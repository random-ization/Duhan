import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * 获取批注/笔记
 * 支持两种模式：
 * - 教材文本标注 (targetType: TEXTBOOK)
 * - TOPIK 画板笔记 (targetType: EXAM)
 */
export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { targetId, targetType, pageIndex, contextKey } = req.query;

    const where: any = { userId };

    // 支持按 contextKey 查询（教材文本标注）
    if (contextKey) {
      where.contextKey = String(contextKey);
    }

    // 支持按 targetType + targetId 查询（TOPIK 画板）
    if (targetType) {
      where.targetType = String(targetType);
    }
    if (targetId) {
      where.targetId = String(targetId);
    }

    // 如果指定了 pageIndex，只返回该页的笔记
    if (pageIndex !== undefined) {
      where.pageIndex = Number(pageIndex);
    }

    const annotations = await prisma.annotation.findMany({
      where,
      orderBy: [
        { pageIndex: 'asc' },
        { createdAt: 'desc' }
      ],
    });

    res.json(annotations);
  } catch (e: any) {
    console.error('Failed to fetch annotations:', e);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
};

/**
 * 保存批注/笔记 (upsert 逻辑)
 * 支持两种模式：
 * - 教材文本标注 (contextKey + startOffset + endOffset)
 * - TOPIK 画板笔记 (targetType=EXAM + targetId + pageIndex + data)
 */
export const saveAnnotation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      // 通用字段
      id,
      targetType,
      targetId,
      pageIndex,
      visibility,

      // 文本标注字段（教材）
      contextKey,
      startOffset,
      endOffset,
      sentenceIndex,
      text,
      color,
      note,

      // 画板字段（TOPIK）
      data
    } = req.body;

    // TOPIK 画板笔记 (targetType = "EXAM")
    if (targetType === 'EXAM' && targetId !== undefined && pageIndex !== undefined) {
      // 查找是否已有该页的笔记
      const existing = await prisma.annotation.findFirst({
        where: {
          userId,
          targetType: 'EXAM',
          targetId: String(targetId),
          pageIndex: Number(pageIndex),
        },
      });

      let annotation;
      if (existing) {
        // 更新已有笔记
        annotation = await prisma.annotation.update({
          where: { id: existing.id },
          data: {
            data: data || existing.data,
            visibility: visibility || 'PRIVATE',
            note: note !== undefined ? note : existing.note,
            color: color !== undefined ? color : existing.color,
          },
        });
      } else {
        // 创建新笔记
        annotation = await prisma.annotation.create({
          data: {
            userId,
            targetType: 'EXAM',
            targetId: String(targetId),
            pageIndex: Number(pageIndex),
            data,
            visibility: visibility || 'PRIVATE',
            contextKey: contextKey || `exam-${targetId}-${pageIndex}`,
            text: text || '',
            color,
            note,
          },
        });
      }

      return res.json(annotation);
    }

    // 教材文本标注 (targetType = "TEXTBOOK" 或默认)
    if (contextKey) {
      // 如果提供了 id，尝试更新
      if (id) {
        const existing = await prisma.annotation.findFirst({
          where: { id, userId },
        });

        if (existing) {
          // 检查是否需要删除（color 和 note 都为空）
          if (!color && !note) {
            await prisma.annotation.delete({ where: { id } });
            return res.json({ success: true, deleted: true });
          }

          const annotation = await prisma.annotation.update({
            where: { id },
            data: {
              color,
              note,
              text: text || existing.text,
            },
          });
          return res.json(annotation);
        }
      }

      // 创建新的文本标注
      const annotation = await prisma.annotation.create({
        data: {
          userId,
          contextKey,
          startOffset,
          endOffset,
          sentenceIndex,
          text: text || '',
          color,
          note,
          targetType: targetType || 'TEXTBOOK',
          targetId,
          pageIndex,
          visibility: visibility || 'PRIVATE',
        },
      });

      return res.json(annotation);
    }

    return res.status(400).json({
      error: 'Invalid request: must provide either contextKey (for textbook) or targetType=EXAM with targetId and pageIndex (for TOPIK)'
    });

  } catch (e: any) {
    console.error('Failed to save annotation:', e);
    res.status(500).json({ error: 'Failed to save annotation' });
  }
};

/**
 * 删除批注
 */
export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // 确保用户只能删除自己的笔记
    const annotation = await prisma.annotation.findFirst({
      where: { id, userId },
    });

    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    await prisma.annotation.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Failed to delete annotation:', e);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};
