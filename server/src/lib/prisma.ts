// @ts-ignore
import { PrismaClient, defineAdapter } from '@prisma/client'

// Prevent multiple instances in development due to hot reloading
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter: defineAdapter({ url: process.env.DATABASE_URL })
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
