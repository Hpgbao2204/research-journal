import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

/**
 * Embedded PostgreSQL (PGlite) for zero-install local development.
 *
 * PGlite runs Postgres in-process and persists to a local directory, so the
 * app can show real seeded data on localhost without installing PostgreSQL or
 * Docker. Enabled when DATABASE_URL starts with "pglite" (see .env). For
 * production, use a real PostgreSQL connection string and the pg adapter.
 *
 * The instance and schema-init promise are cached on globalThis to survive
 * Next.js dev hot-reload and to keep a single connection (PGlite is
 * single-connection).
 */

// Plain relative path: PGlite's Node filesystem resolves it against cwd.
// (Avoid file:// URLs — PGlite mishandles them as Windows drive paths.)
const PGLITE_DIR = ".pglite";

const globalForPglite = globalThis as unknown as {
  __pglite?: PGlite;
  __pgliteSchemaReady?: Promise<void>;
};

export function getPglite(): PGlite {
  if (!globalForPglite.__pglite) {
    globalForPglite.__pglite = new PGlite(PGLITE_DIR);
  }
  return globalForPglite.__pglite;
}

export async function getPgliteAdapter(): Promise<PrismaPGlite> {
  const client = getPglite();
  await client.waitReady;
  return new PrismaPGlite(client);
}

/**
 * Create the schema if it does not yet exist (idempotent). Runs the SQL emitted
 * by `prisma migrate diff` (prisma/schema.sql). Cached so it runs once.
 */
export function ensurePgliteSchema(): Promise<void> {
  if (!globalForPglite.__pgliteSchemaReady) {
    globalForPglite.__pgliteSchemaReady = (async () => {
      const client = getPglite();
      await client.waitReady;
      const exists = await client.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'Journal'
         ) AS exists`,
      );
      if (exists.rows[0]?.exists) return;
      const sql = readFileSync(path.join(process.cwd(), "prisma", "schema.sql"), "utf8");
      await client.exec(sql);
    })();
  }
  return globalForPglite.__pgliteSchemaReady;
}
