import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Helper to check admin role (assumes authenticate middleware set req.user)
const isAdmin = (req: Request) => {
  // Adjust according to your middleware: maybe req.user or res.locals.user
  const u = (req as any).user;
  return u && u.role === 'ADMIN';
};

export const getUsers = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    res.json(users);
  } catch (err) {
    console.error('getUsers error', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const updates = req.body || {};

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        avatar: true,
        createdAt: true,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('updateUser error', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
