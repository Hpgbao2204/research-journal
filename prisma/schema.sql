-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED_MOCK', 'IMPORTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "VenueLifecycleStatus" AS ENUM ('OPEN', 'CLOSED', 'UPCOMING');

-- CreateEnum
CREATE TYPE "ConferenceMode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ConferenceRanking" AS ENUM ('CORE_A_STAR', 'CORE_A', 'CORE_B', 'CORE_C', 'OTHER');

-- CreateEnum
CREATE TYPE "Quartile" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('JOURNAL', 'CONFERENCE', 'SPECIAL_ISSUE');

-- CreateEnum
CREATE TYPE "RecommendationMethod" AS ENUM ('AI', 'RULE_BASED');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reliability" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "issn" TEXT,
    "eissn" TEXT,
    "fieldId" TEXT,
    "scope" TEXT,
    "indexing" TEXT[],
    "quartile" "Quartile",
    "impactFactor" DOUBLE PRECISION,
    "apc" INTEGER,
    "openAccess" BOOLEAN,
    "submissionUrl" TEXT,
    "submissionDeadline" TIMESTAMP(3),
    "country" TEXT,
    "notes" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_MOCK',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "journalId" TEXT,
    "publisher" TEXT,
    "topicScope" TEXT,
    "guestEditors" TEXT,
    "fieldId" TEXT,
    "submissionDeadline" TIMESTAMP(3),
    "publicationTimeline" TEXT,
    "submissionUrl" TEXT,
    "lifecycleStatus" "VenueLifecycleStatus" NOT NULL DEFAULT 'UPCOMING',
    "sourceUrl" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_MOCK',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "fieldId" TEXT,
    "organizer" TEXT,
    "location" TEXT,
    "country" TEXT,
    "mode" "ConferenceMode",
    "submissionDeadline" TIMESTAMP(3),
    "notificationDate" TIMESTAMP(3),
    "conferenceDate" TIMESTAMP(3),
    "ranking" "ConferenceRanking",
    "indexing" TEXT[],
    "cfpUrl" TEXT,
    "lifecycleStatus" "VenueLifecycleStatus" NOT NULL DEFAULT 'UPCOMING',
    "sourceUrl" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_MOCK',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "authors" TEXT,
    "fieldId" TEXT,
    "venueName" TEXT,
    "year" INTEGER,
    "doi" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "officialUrl" TEXT,
    "dataSourceId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_MOCK',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationResult" (
    "id" TEXT NOT NULL,
    "inputTitle" TEXT NOT NULL,
    "inputAbstract" TEXT NOT NULL,
    "inputKeywords" TEXT[],
    "inputField" TEXT,
    "preferredVenueType" "VenueType",
    "mainTopic" TEXT,
    "subfield" TEXT,
    "methodology" TEXT,
    "contributionType" TEXT,
    "extractedKeywords" TEXT[],
    "suitableDisciplines" TEXT[],
    "suggestedAbstract" TEXT,
    "suggestedTitle" TEXT,
    "method" "RecommendationMethod" NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "venueType" "VenueType" NOT NULL,
    "venueId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "scopeAlignment" TEXT,
    "submissionDeadline" TIMESTAMP(3),
    "indexing" TEXT[],
    "submissionUrl" TEXT,
    "warnings" TEXT[],
    "rank" INTEGER NOT NULL,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PaperKeywords" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PaperKeywords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SpecialIssueKeywords" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SpecialIssueKeywords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_JournalKeywords" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JournalKeywords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ConferenceKeywords" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConferenceKeywords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Field_name_key" ON "Field"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_term_key" ON "Keyword"("term");

-- CreateIndex
CREATE INDEX "Journal_fieldId_idx" ON "Journal"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_dataSourceId_sourceUrl_key" ON "Journal"("dataSourceId", "sourceUrl");

-- CreateIndex
CREATE INDEX "SpecialIssue_fieldId_idx" ON "SpecialIssue"("fieldId");

-- CreateIndex
CREATE INDEX "SpecialIssue_journalId_idx" ON "SpecialIssue"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialIssue_dataSourceId_sourceUrl_key" ON "SpecialIssue"("dataSourceId", "sourceUrl");

-- CreateIndex
CREATE INDEX "Conference_fieldId_idx" ON "Conference"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Conference_dataSourceId_sourceUrl_key" ON "Conference"("dataSourceId", "sourceUrl");

-- CreateIndex
CREATE INDEX "Paper_fieldId_idx" ON "Paper"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_dataSourceId_sourceUrl_key" ON "Paper"("dataSourceId", "sourceUrl");

-- CreateIndex
CREATE INDEX "RecommendationItem_resultId_idx" ON "RecommendationItem"("resultId");

-- CreateIndex
CREATE INDEX "_PaperKeywords_B_index" ON "_PaperKeywords"("B");

-- CreateIndex
CREATE INDEX "_SpecialIssueKeywords_B_index" ON "_SpecialIssueKeywords"("B");

-- CreateIndex
CREATE INDEX "_JournalKeywords_B_index" ON "_JournalKeywords"("B");

-- CreateIndex
CREATE INDEX "_ConferenceKeywords_B_index" ON "_ConferenceKeywords"("B");

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialIssue" ADD CONSTRAINT "SpecialIssue_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialIssue" ADD CONSTRAINT "SpecialIssue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialIssue" ADD CONSTRAINT "SpecialIssue_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conference" ADD CONSTRAINT "Conference_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conference" ADD CONSTRAINT "Conference_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "RecommendationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaperKeywords" ADD CONSTRAINT "_PaperKeywords_A_fkey" FOREIGN KEY ("A") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaperKeywords" ADD CONSTRAINT "_PaperKeywords_B_fkey" FOREIGN KEY ("B") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpecialIssueKeywords" ADD CONSTRAINT "_SpecialIssueKeywords_A_fkey" FOREIGN KEY ("A") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpecialIssueKeywords" ADD CONSTRAINT "_SpecialIssueKeywords_B_fkey" FOREIGN KEY ("B") REFERENCES "SpecialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JournalKeywords" ADD CONSTRAINT "_JournalKeywords_A_fkey" FOREIGN KEY ("A") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JournalKeywords" ADD CONSTRAINT "_JournalKeywords_B_fkey" FOREIGN KEY ("B") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceKeywords" ADD CONSTRAINT "_ConferenceKeywords_A_fkey" FOREIGN KEY ("A") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceKeywords" ADD CONSTRAINT "_ConferenceKeywords_B_fkey" FOREIGN KEY ("B") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
