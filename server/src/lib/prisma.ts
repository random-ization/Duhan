// server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 防止开发环境下热重载导致产生多个 Prisma 实例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// ⬇️ 修改重点：显式传入 datasources 配置 ⬇️
export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 如果你需要日志，也可以加上
  // log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
