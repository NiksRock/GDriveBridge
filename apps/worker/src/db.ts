import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton for Worker
 *
 * Prevents multiple Prisma connections during hot reload/dev mode.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown
 * Ensures DB connections close cleanly when worker stops.
 */
process.on('SIGINT', async () => {
  console.log('🛑 Worker shutting down (SIGINT)...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Worker shutting down (SIGTERM)...');
  await prisma.$disconnect();
  process.exit(0);
});
