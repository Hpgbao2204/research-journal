import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/http/errors";
import { logger } from "@/lib/http/logger";
import { openAlex } from "@/lib/providers/openalex";
import { scimago } from "@/lib/providers/scimago";
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
    // Top journals by SJR from the Scimago catalogue (OpenAlex fallback).
    if (scimago.isLoaded()) {
      return scimago.searchJournals({ sort: "sjr", page: 1, pageSize: 24 }).items;
    }
    return safeList("venueService.listJournals", () => openAlex.searchJournals({ perPage: 24 }));
  },

  async getJournal(id: string): Promise<JournalDTO> {
    // Scimago source ids are numeric; OpenAlex ids look like "S####".
    if (/^\d+$/.test(id)) {
      const j = scimago.getById(id);
      if (j) {
        // Enrich with OpenAlex homepage/scope by ISSN when available.
        try {
          const enriched = j.issn ? await openAlex.findJournalByIssn(j.issn) : null;
          if (enriched) {
            j.officialUrl = enriched.officialUrl ?? j.officialUrl;
            if (enriched.scope) j.scope = j.scope ? `${j.scope} ${enriched.scope}` : enriched.scope;
          }
        } catch {
          // enrichment is best-effort
        }
        return j;
      }
      throw new NotFoundError(`Journal ${id} not found`);
    }
    if (openAlex.isOpenAlexId(id)) {
      const j = await openAlex.getJournal(id);
      if (!j) throw new NotFoundError(`Journal ${id} not found`);
      return j;
    }
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
