import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/http/errors";
import { logger } from "@/lib/http/logger";
import type { ConferenceDTO, JournalDTO, SpecialIssueDTO } from "@/lib/dto";
import {
  toConferenceDTO,
  toJournalDTO,
  toSpecialIssueDTO,
  venueInclude,
  specialIssueInclude,
} from "./mappers";

/**
 * Returns a fallback value (logging the error) when a database query fails so
 * that list views degrade gracefully — e.g. when no database is configured yet
 * during local preview — instead of crashing the page (Req 15.3).
 */
async function safeList<T>(operation: string, run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch (err) {
    logger.error(operation, err);
    return [];
  }
}

/**
 * Read-only list/detail access for the three venue types. Detail lookups throw
 * NotFoundError (mapped to 404) when an id does not exist.
 */
export const venueService = {
  async listJournals(): Promise<JournalDTO[]> {
    return safeList("venueService.listJournals", async () => {
      const rows = await prisma.journal.findMany({
        include: venueInclude,
        orderBy: { name: "asc" },
      });
      return rows.map(toJournalDTO);
    });
  },

  async getJournal(id: string): Promise<JournalDTO> {
    const row = await prisma.journal.findUnique({ where: { id }, include: venueInclude });
    if (!row) throw new NotFoundError(`Journal ${id} not found`);
    return toJournalDTO(row);
  },

  async listConferences(): Promise<ConferenceDTO[]> {
    return safeList("venueService.listConferences", async () => {
      const rows = await prisma.conference.findMany({
        include: venueInclude,
        orderBy: { name: "asc" },
      });
      return rows.map(toConferenceDTO);
    });
  },

  async getConference(id: string): Promise<ConferenceDTO> {
    const row = await prisma.conference.findUnique({ where: { id }, include: venueInclude });
    if (!row) throw new NotFoundError(`Conference ${id} not found`);
    return toConferenceDTO(row);
  },

  async listSpecialIssues(): Promise<SpecialIssueDTO[]> {
    return safeList("venueService.listSpecialIssues", async () => {
      const rows = await prisma.specialIssue.findMany({
        include: specialIssueInclude,
        orderBy: { title: "asc" },
      });
      return rows.map(toSpecialIssueDTO);
    });
  },

  async getSpecialIssue(id: string): Promise<SpecialIssueDTO> {
    const row = await prisma.specialIssue.findUnique({
      where: { id },
      include: specialIssueInclude,
    });
    if (!row) throw new NotFoundError(`Special issue ${id} not found`);
    return toSpecialIssueDTO(row);
  },
};
