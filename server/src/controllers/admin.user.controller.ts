import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper to check admin role (assumes authenticate middleware set req.user)
const isAdmin = (req: Request) => {
  const u = (req as any).user;
  return u && u.role === 'ADMIN';
};

/**
 * GET /admin/users
 * 获取用户列表，支持分页和搜索
 * Query params: page, limit, search
 */
export const getUsers = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
      : {};

    // Get total count for pagination
    const total = await prisma.user.count({ where: whereClause });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        avatar: true,
        createdAt: true,
        subscriptionType: true,
        subscriptionExpiry: true,
        _count: {
          select: {
            savedWords: true,
            examHistory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Map users to include computed statistics
    const usersWithStats = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      avatar: user.avatar,
      createdAt: user.createdAt,
      subscriptionType: user.subscriptionType,
      subscriptionExpiry: user.subscriptionExpiry,
      wordsLearned: user._count.savedWords,
      examsTaken: user._count.examHistory,
    }));

    res.json({
      users: usersWithStats,
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    });
  } catch (err) {
    console.error('getUsers error', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * PUT /admin/users/:id
 * 更新用户信息
 * Body: name, role, tier, subscriptionType, subscriptionExpiry
 */
export const updateUser = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const { name, role, tier, subscriptionType, subscriptionExpiry } = req.body || {};

  try {
    // Build update data - only include provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (tier !== undefined) updateData.tier = tier;
    if (subscriptionType !== undefined) updateData.subscriptionType = subscriptionType;
    if (subscriptionExpiry !== undefined) {
      updateData.subscriptionExpiry = subscriptionExpiry ? new Date(subscriptionExpiry) : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        avatar: true,
        createdAt: true,
        subscriptionType: true,
        subscriptionExpiry: true,
      },
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('updateUser error', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * DELETE /admin/users/:id
 * 删除用户及其关联数据
 */
export const deleteUser = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;

  try {
    // Use transaction to delete all related records first, then the user
    await prisma.$transaction([
      prisma.savedWord.deleteMany({ where: { userId: id } }),
      prisma.mistake.deleteMany({ where: { userId: id } }),
      prisma.annotation.deleteMany({ where: { userId: id } }),
      prisma.examAttempt.deleteMany({ where: { userId: id } }),
      prisma.learningActivity.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
