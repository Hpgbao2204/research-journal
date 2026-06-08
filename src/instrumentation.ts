/**
 * Next.js instrumentation: runs once when the server starts.
 *
 * When using the embedded PGlite database (DATABASE_URL starts with "pglite"),
 * this creates the schema and seeds sample data on first startup so the app
 * shows real data on localhost with zero external setup. No-op for real
 * PostgreSQL (use `prisma migrate` + `prisma db seed` there).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!(process.env.DATABASE_URL ?? "").startsWith("pglite")) return;

  const { ensurePgliteSchema } = await import("@/lib/db/pglite");
  const { prisma } = await import("@/lib/db/prisma");
  const { seedDatabase } = await import("../prisma/seed");

  try {
    await ensurePgliteSchema();
    const count = await prisma.journal.count();
    if (count === 0) {
      await seedDatabase(prisma);
      console.info("[instrumentation] PGlite seeded with sample data.");
    }
  } catch (err) {
    console.error("[instrumentation] PGlite init failed:", err);
  }
}
