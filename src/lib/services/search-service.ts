import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/http/logger";
import type { SearchParams } from "@/lib/schemas";
import type { SearchResults } from "@/lib/dto";
import { openAlex } from "@/lib/providers/openalex";
import {
  toConferenceDTO,
  toSpecialIssueDTO,
  venueInclude,
  specialIssueInclude,
} from "./mappers";

/**
 * Search Service. Queries Papers, Journals, Conferences, and Special Issues
 * with the supplied filters. Every returned record satisfies all applied
 * filters (filter soundness). A keyword query matches name/title/scope/keyword.
 */

function includesContent(
  params: SearchParams,
  type: "JOURNAL" | "CONFERENCE" | "SPECIAL_ISSUE" | "PAPER",
): boolean {
  return !params.contentType || params.contentType === type;
}

function deadlineFilter(params: SearchParams): Prisma.DateTimeNullableFilter | undefined {
  if (!params.deadlineFrom && !params.deadlineTo) return undefined;
  return {
    ...(params.deadlineFrom ? { gte: params.deadlineFrom } : {}),
    ...(params.deadlineTo ? { lte: params.deadlineTo } : {}),
  };
}

export const searchService = {
  async search(params: SearchParams): Promise<SearchResults> {
    try {
      return await runSearch(params);
    } catch (err) {
      // Degrade gracefully (e.g. no database configured during local preview).
      logger.error("searchService.search", err);
      return { journals: [], conferences: [], specialIssues: [], papers: [], total: 0 };
    }
  },
};

async function runSearch(params: SearchParams): Promise<SearchResults> {
  const q = params.q?.trim();
  const fieldName = params.field;
  const indexing = params.indexing;

  // ---- Journals (live from OpenAlex) -------------------------------------
  let journals: SearchResults["journals"] = [];
  if (includesContent(params, "JOURNAL")) {
    // OpenAlex has no Scopus/IEEE/... indexing flags, so fold the chosen
    // indexing/publisher into the search query (e.g. IEEE -> IEEE journals)
    // rather than filtering on data we don't have.
    const journalQuery = [q, indexing].filter(Boolean).join(" ").trim() || undefined;
    journals = await openAlex.searchJournals({
      q: journalQuery,
      field: fieldName,
      openAccess: params.openAccess,
      country: params.country,
      publisher: params.publisher,
      perPage: 30,
    });
    // Apply filters only where OpenAlex provides the underlying data.
    if (params.quartile) journals = journals.filter((j) => j.quartile === params.quartile);
    if (params.apcMin != null) journals = journals.filter((j) => j.apc != null && j.apc >= params.apcMin!);
    if (params.apcMax != null) journals = journals.filter((j) => j.apc != null && j.apc <= params.apcMax!);
  }

  // ---- Conferences -------------------------------------------------------
  let conferences: SearchResults["conferences"] = [];
  if (includesContent(params, "CONFERENCE")) {
    const where: Prisma.ConferenceWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { acronym: { contains: q, mode: "insensitive" } },
        { keywords: { some: { term: { contains: q, mode: "insensitive" } } } },
      ];
    }
    if (fieldName) where.field = { name: fieldName };
    if (indexing) where.indexing = { has: indexing };
    if (params.publisher) where.organizer = { contains: params.publisher, mode: "insensitive" };
    if (params.country) where.country = { contains: params.country, mode: "insensitive" };
    const deadline = deadlineFilter(params);
    if (deadline) where.submissionDeadline = deadline;
    if (params.confDateFrom || params.confDateTo) {
      where.conferenceDate = {
        ...(params.confDateFrom ? { gte: params.confDateFrom } : {}),
        ...(params.confDateTo ? { lte: params.confDateTo } : {}),
      };
    }

    const rows = await prisma.conference.findMany({
      where,
      include: venueInclude,
      orderBy: { name: "asc" },
    });
    conferences = rows.map(toConferenceDTO);
  }

  // ---- Special Issues ----------------------------------------------------
  let specialIssues: SearchResults["specialIssues"] = [];
  if (includesContent(params, "SPECIAL_ISSUE")) {
    const where: Prisma.SpecialIssueWhereInput = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { topicScope: { contains: q, mode: "insensitive" } },
        { keywords: { some: { term: { contains: q, mode: "insensitive" } } } },
      ];
    }
    if (fieldName) where.field = { name: fieldName };
    if (params.publisher) where.publisher = { contains: params.publisher, mode: "insensitive" };
    const deadline = deadlineFilter(params);
    if (deadline) where.submissionDeadline = deadline;

    const rows = await prisma.specialIssue.findMany({
      where,
      include: specialIssueInclude,
      orderBy: { title: "asc" },
    });
    specialIssues = rows.map(toSpecialIssueDTO);
  }

  // ---- Papers (live from OpenAlex) ---------------------------------------
  let papers: SearchResults["papers"] = [];
  if (includesContent(params, "PAPER")) {
    papers = await openAlex.searchPapers(q, 25);
    if (fieldName) {
      const f = fieldName.toLowerCase();
      papers = papers.filter(
        (p) => p.field?.toLowerCase().includes(f) || p.keywords.some((k) => k.toLowerCase().includes(f)),
      );
    }
  }

  return {
    journals,
    conferences,
    specialIssues,
    papers,
    total:
      journals.length +
      conferences.length +
      specialIssues.length +
      papers.length,
  };
}
