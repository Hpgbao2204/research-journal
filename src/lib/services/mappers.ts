import type { Prisma } from "@prisma/client";
import type {
  ConferenceDTO,
  JournalDTO,
  PaperDTO,
  ProvenanceDTO,
  SpecialIssueDTO,
  VerificationStatus,
} from "@/lib/dto";

/**
 * Prisma -> DTO mappers. These resolve relations (field, keywords, dataSource)
 * and serialize dates to ISO strings. Each venue/paper query must include the
 * relations referenced here (see the `*Include` helpers below).
 */

export const venueInclude = {
  field: true,
  keywords: true,
  dataSource: true,
} satisfies Prisma.JournalInclude;

export const specialIssueInclude = {
  field: true,
  keywords: true,
  dataSource: true,
  journal: { select: { id: true, name: true } },
} satisfies Prisma.SpecialIssueInclude;

type JournalWithRelations = Prisma.JournalGetPayload<{ include: typeof venueInclude }>;
type ConferenceWithRelations = Prisma.ConferenceGetPayload<{ include: typeof venueInclude }>;
type SpecialIssueWithRelations = Prisma.SpecialIssueGetPayload<{ include: typeof specialIssueInclude }>;
type PaperWithRelations = Prisma.PaperGetPayload<{ include: typeof venueInclude }>;

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function provenance(record: {
  sourceUrl: string;
  officialUrl?: string | null;
  verificationStatus: VerificationStatus;
  lastCheckedAt: Date;
  updatedAt: Date;
  dataSource: { id: string; name: string; reliability: string } | null;
}): ProvenanceDTO {
  return {
    sourceUrl: record.sourceUrl,
    officialUrl: record.officialUrl ?? null,
    dataSource: record.dataSource
      ? {
        id: record.dataSource.id,
        name: record.dataSource.name,
        reliability: record.dataSource.reliability,
      }
      : null,
    verificationStatus: record.verificationStatus,
    isUnverified: record.verificationStatus === "UNVERIFIED_MOCK",
    lastCheckedAt: record.lastCheckedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toJournalDTO(j: JournalWithRelations): JournalDTO {
  return {
    ...provenance(j),
    id: j.id,
    name: j.name,
    publisher: j.publisher,
    issn: j.issn,
    eissn: j.eissn,
    field: j.field?.name ?? null,
    scope: j.scope,
    indexing: j.indexing,
    quartile: j.quartile,
    impactFactor: j.impactFactor,
    sjr: null,
    hIndex: null,
    areas: [],
    categories: [],
    apc: j.apc,
    openAccess: j.openAccess,
    submissionUrl: j.submissionUrl,
    submissionDeadline: iso(j.submissionDeadline),
    country: j.country,
    notes: j.notes,
    keywords: j.keywords.map((k) => k.term),
  };
}

export function toConferenceDTO(c: ConferenceWithRelations): ConferenceDTO {
  return {
    ...provenance(c),
    id: c.id,
    name: c.name,
    acronym: c.acronym,
    field: c.field?.name ?? null,
    organizer: c.organizer,
    location: c.location,
    country: c.country,
    mode: c.mode,
    submissionDeadline: iso(c.submissionDeadline),
    notificationDate: iso(c.notificationDate),
    conferenceDate: iso(c.conferenceDate),
    ranking: c.ranking,
    indexing: c.indexing,
    cfpUrl: c.cfpUrl,
    lifecycleStatus: c.lifecycleStatus,
    keywords: c.keywords.map((k) => k.term),
  };
}

export function toSpecialIssueDTO(s: SpecialIssueWithRelations): SpecialIssueDTO {
  return {
    ...provenance(s),
    id: s.id,
    title: s.title,
    journalId: s.journalId,
    journalName: s.journal?.name ?? null,
    publisher: s.publisher,
    topicScope: s.topicScope,
    guestEditors: s.guestEditors,
    field: s.field?.name ?? null,
    submissionDeadline: iso(s.submissionDeadline),
    publicationTimeline: s.publicationTimeline,
    submissionUrl: s.submissionUrl,
    lifecycleStatus: s.lifecycleStatus,
    keywords: s.keywords.map((k) => k.term),
  };
}

export function toPaperDTO(p: PaperWithRelations): PaperDTO {
  return {
    ...provenance(p),
    id: p.id,
    title: p.title,
    abstract: p.abstract,
    authors: p.authors,
    field: p.field?.name ?? null,
    venueName: p.venueName,
    year: p.year,
    doi: p.doi,
    keywords: p.keywords.map((k) => k.term),
  };
}
