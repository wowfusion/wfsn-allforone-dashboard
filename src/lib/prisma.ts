/**
 * Prisma Client Singleton für Next.js (Prisma 7).
 * Nutzt @prisma/adapter-pg als Driver-Adapter (Pflicht in Prisma 7 mit engineType "client").
 * Verhindert mehrere Instanzen im Development-Modus (Hot Reload).
 */

import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[Prisma] DATABASE_URL nicht gesetzt – DB-Operationen werden fehlschlagen');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
