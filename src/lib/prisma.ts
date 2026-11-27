import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDisconnectRegistered: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;

  // Register beforeExit handler once to prevent connection pool exhaustion
  // during hot reload in development
  if (!globalForPrisma.prismaDisconnectRegistered) {
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
    globalForPrisma.prismaDisconnectRegistered = true;
  }
}

export default prisma;