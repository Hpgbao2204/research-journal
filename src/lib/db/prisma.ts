import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Shared PrismaClient (server-only).
 *
 * Prisma 7 no longer reads the connection URL from `schema.prisma`. Instead the
 * client is constructed with a driver adapter. We use `@prisma/adapter-pg`
 * (node-postgres) and read `DATABASE_URL` from the environment.
 *
 * In development, Next.js hot-reloads modules which would otherwise create many
 * connections; we cache the client on the global object to avoid exhausting the
 * connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set the PostgreSQL connection string.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
