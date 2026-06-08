import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Shared PrismaClient (server-only).
 *
 * Prisma 7 constructs the client with a driver adapter. Two modes:
 *   - DATABASE_URL starts with "pglite" → embedded PGlite (zero-install local
 *     dev; schema + seed are initialized by src/instrumentation.ts on startup).
 *   - otherwise → real PostgreSQL via the node-postgres (pg) adapter.
 *
 * The client is cached on the global object to avoid creating many connections
 * during Next.js dev hot-reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isPglite(): boolean {
  return (process.env.DATABASE_URL ?? "").startsWith("pglite");
}

function createPrismaClient(): PrismaClient {
  if (isPglite()) {
    // Lazy require keeps PGlite out of production bundles when unused, and
    // reuses the single shared instance/path defined in ./pglite.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPglite } = require("./pglite") as typeof import("./pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPGlite } = require("pglite-prisma-adapter");
    return new PrismaClient({ adapter: new PrismaPGlite(getPglite()) });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set the connection string.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
