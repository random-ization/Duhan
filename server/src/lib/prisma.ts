// server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 防止开发环境下热重载导致产生多个 Prisma 实例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
