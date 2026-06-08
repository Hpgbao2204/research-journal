import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/http/logger";
import { seedDatabase } from "../../../prisma/seed";

/**
 * Admin Service — isolated from public functionality so an authentication
 * guard can be added later without touching the public surface (Req 12.3).
 *
 * NOTE (MVP): there is intentionally no auth here yet. Before deploying, wrap
 * the admin routes/page with an auth check.
 */

export interface SeedCounts {
  journals: number;
  conferences: number;
  specialIssues: number;
  papers: number;
}

export interface AdminListing {
  journals: Array<{ id: string; name: string; verificationStatus: string }>;
  conferences: Array<{ id: string; name: string; verificationStatus: string }>;
  specialIssues: Array<{ id: string; title: string; verificationStatus: string }>;
  papers: number;
}

export const adminService = {
  /** Run the seed script (idempotent) and return current DB counts. */
  async seed(): Promise<{ created: SeedCounts }> {
    await seedDatabase(prisma);
    const [journals, conferences, specialIssues, papers] = await Promise.all([
      prisma.journal.count(),
      prisma.conference.count(),
      prisma.specialIssue.count(),
      prisma.paper.count(),
    ]);
    return { created: { journals, conferences, specialIssues, papers } };
  },

  /** List DB-backed venue records (cache + sample data) for management. */
  async listAll(): Promise<AdminListing> {
    try {
      const [journals, conferences, specialIssues, papers] = await Promise.all([
        prisma.journal.findMany({
          select: { id: true, name: true, verificationStatus: true },
          orderBy: { name: "asc" },
        }),
        prisma.conference.findMany({
          select: { id: true, name: true, verificationStatus: true },
          orderBy: { name: "asc" },
        }),
        prisma.specialIssue.findMany({
          select: { id: true, title: true, verificationStatus: true },
          orderBy: { title: "asc" },
        }),
        prisma.paper.count(),
      ]);
      return { journals, conferences, specialIssues, papers };
    } catch (err) {
      logger.error("adminService.listAll", err);
      return { journals: [], conferences: [], specialIssues: [], papers: 0 };
    }
  },
};
