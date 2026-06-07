import { PrismaClient } from "@prisma/client";

/**
 * Single shared PrismaClient instance. In development, Next.js hot-reloads
 * modules which would otherwise create many connections; we cache the client
 * on the global object to avoid exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
