/**
 * Data Transfer Objects returned by the API to the client. DTOs resolve Prisma
 * relations (field name, keyword terms, data-source label) and add computed
 * flags such as `isUnverified`. They never include server-only data.
 */

export type VerificationStatus = "UNVERIFIED_MOCK" | "IMPORTED" | "VERIFIED";
export type LifecycleStatus = "OPEN" | "CLOSED" | "UPCOMING";

export interface DataSourceDTO {
  id: string;
  name: string;
  reliability: string;
}

/** Common provenance surface shared by every venue/paper DTO. */
export interface ProvenanceDTO {
  sourceUrl: string;
  officialUrl: string | null;
  dataSource: DataSourceDTO | null;
  verificationStatus: VerificationStatus;
  /** True when the record is unverified sample/mock data. */
  isUnverified: boolean;
  lastCheckedAt: string;
  updatedAt: string;
}

export interface JournalDTO extends ProvenanceDTO {
  id: string;
  name: string;
  publisher: string | null;
  issn: string | null;
  eissn: string | null;
  field: string | null;
  scope: string | null;
  indexing: string[];
  quartile: string | null;
  impactFactor: number | null;
  sjr: number | null;
  hIndex: number | null;
  areas: string[];
  categories: string[];
  apc: number | null;
  openAccess: boolean | null;
  submissionUrl: string | null;
  submissionDeadline: string | null;
  country: string | null;
  notes: string | null;
  keywords: string[];
}

export interface SpecialIssueDTO extends ProvenanceDTO {
  id: string;
  title: string;
  journalId: string | null;
  journalName: string | null;
  publisher: string | null;
  topicScope: string | null;
  guestEditors: string | null;
  field: string | null;
  submissionDeadline: string | null;
  publicationTimeline: string | null;
  submissionUrl: string | null;
  lifecycleStatus: LifecycleStatus;
  keywords: string[];
}

export interface ConferenceDTO extends ProvenanceDTO {
  id: string;
  name: string;
  acronym: string | null;
  field: string | null;
  organizer: string | null;
  location: string | null;
  country: string | null;
  mode: string | null;
  submissionDeadline: string | null;
  notificationDate: string | null;
  conferenceDate: string | null;
  ranking: string | null;
  indexing: string[];
  cfpUrl: string | null;
  lifecycleStatus: LifecycleStatus;
  keywords: string[];
}

export interface PaperDTO extends ProvenanceDTO {
  id: string;
  title: string;
  abstract: string | null;
  authors: string | null;
  field: string | null;
  venueName: string | null;
  year: number | null;
  doi: string | null;
  keywords: string[];
}

export type ContentType = "JOURNAL" | "CONFERENCE" | "SPECIAL_ISSUE" | "PAPER";

export interface SearchResults {
  journals: JournalDTO[];
  conferences: ConferenceDTO[];
  specialIssues: SpecialIssueDTO[];
  papers: PaperDTO[];
  total: number;
  /** Total journals matching the query across all pages (for pagination). */
  journalsTotal?: number;
  page?: number;
  pageSize?: number;
}

export interface RecommendationResultDTO {
  id: string;
  inputTitle: string;
  inputAbstract: string;
  inputKeywords: string[];
  inputField: string | null;
  preferredVenueType: string | null;
  mainTopic: string | null;
  subfield: string | null;
  methodology: string | null;
  contributionType: string | null;
  extractedKeywords: string[];
  suitableDisciplines: string[];
  suggestedTitle: string | null;
  suggestedAbstract: string | null;
  method: "AI" | "RULE_BASED";
  saved: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    venueType: string;
    venueId: string;
    venueName: string;
    matchScore: number;
    reason: string;
    scopeAlignment: string | null;
    submissionDeadline: string | null;
    indexing: string[];
    submissionUrl: string | null;
    warnings: string[];
    rank: number;
  }>;
}
