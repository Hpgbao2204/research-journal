/**
 * PaperScout AI — idempotent seed script.
 *
 * Populates the database with clearly labeled SAMPLE / MOCK venue data so the
 * app can be run and demonstrated locally. Every record:
 *   - is tied to a single sample `DataSource`,
 *   - carries a `sourceUrl` and `officialUrl` (Req 10.1, 11.3),
 *   - is marked `verificationStatus = UNVERIFIED_MOCK` (Req 10.3, 11.2),
 *   - has a populated `lastCheckedAt` (Req 10.5).
 *
 * Idempotency (Req 11.4): all venue/paper records are written with `upsert`
 * keyed on the `@@unique([dataSourceId, sourceUrl])` compound key, so re-running
 * the seed updates existing rows instead of creating duplicates. Fields and
 * Keywords are upserted on their own unique columns (`name` / `term`).
 *
 * IMPORTANT: This is fabricated SAMPLE data for development only. It is NOT
 * verified against any authoritative source and must never be presented as
 * real, verified venue information. Source/official URLs use the reserved
 * example.org / example.com domains to make the mock nature obvious.
 */

import {
  PrismaClient,
  ConferenceMode,
  ConferenceRanking,
  Quartile,
  VenueLifecycleStatus,
  VerificationStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 constructs the client with a driver adapter; the connection URL is
// read from DATABASE_URL (see prisma.config.ts / .env).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and set the PostgreSQL connection string before seeding.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Stable id so the sample DataSource is upserted (not duplicated) across runs.
const SAMPLE_DATA_SOURCE_ID = "ds-sample-mock";

const NOW = new Date();

// ---------------------------------------------------------------------------
// Reference data: Fields and Keywords
// ---------------------------------------------------------------------------

const FIELDS: { name: string; description: string }[] = [
  { name: "Machine Learning", description: "Algorithms that learn patterns from data." },
  { name: "Natural Language Processing", description: "Computational processing of human language." },
  { name: "Computer Vision", description: "Extracting information from images and video." },
  { name: "Cybersecurity", description: "Protection of systems, networks, and data." },
  { name: "Software Engineering", description: "Design, construction, and maintenance of software." },
  { name: "Human-Computer Interaction", description: "Design and use of interactive computing systems." },
  { name: "Bioinformatics", description: "Computational analysis of biological data." },
  { name: "Distributed Systems", description: "Coordination of networked, autonomous components." },
  { name: "Data Management", description: "Storage, querying, and governance of data." },
  { name: "Robotics", description: "Design and control of autonomous machines." },
];

const KEYWORDS: string[] = [
  "deep learning",
  "transformers",
  "graph neural networks",
  "reinforcement learning",
  "text classification",
  "question answering",
  "image segmentation",
  "object detection",
  "intrusion detection",
  "cryptography",
  "static analysis",
  "continuous integration",
  "usability",
  "accessibility",
  "genomics",
  "protein folding",
  "consensus",
  "fault tolerance",
  "query optimization",
  "data integration",
  "motion planning",
  "sensor fusion",
  "federated learning",
  "explainability",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Days from now as a Date, for plausible future/past deadlines. */
function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

type SeedCounts = {
  dataSources: number;
  fields: number;
  keywords: number;
  journals: number;
  conferences: number;
  specialIssues: number;
  papers: number;
};

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. Sample DataSource (provenance anchor)
  // -------------------------------------------------------------------------
  const dataSource = await prisma.dataSource.upsert({
    where: { id: SAMPLE_DATA_SOURCE_ID },
    update: {
      name: "PaperScout Sample Dataset",
      reliability: "unverified-sample",
      description:
        "Fabricated sample/mock venue and paper data for local development. NOT verified against any authoritative source.",
      sourceUrl: "https://example.org/paperscout/sample-dataset",
    },
    create: {
      id: SAMPLE_DATA_SOURCE_ID,
      name: "PaperScout Sample Dataset",
      reliability: "unverified-sample",
      description:
        "Fabricated sample/mock venue and paper data for local development. NOT verified against any authoritative source.",
      sourceUrl: "https://example.org/paperscout/sample-dataset",
    },
  });

  // -------------------------------------------------------------------------
  // 2. Fields (upsert by unique name)
  // -------------------------------------------------------------------------
  const fieldByName = new Map<string, string>();
  for (const f of FIELDS) {
    const rec = await prisma.field.upsert({
      where: { name: f.name },
      update: { description: f.description },
      create: { name: f.name, description: f.description },
    });
    fieldByName.set(f.name, rec.id);
  }

  // -------------------------------------------------------------------------
  // 3. Keywords (upsert by unique term)
  // -------------------------------------------------------------------------
  for (const term of KEYWORDS) {
    await prisma.keyword.upsert({
      where: { term },
      update: {},
      create: { term },
    });
  }

  const counts: SeedCounts = {
    dataSources: 1,
    fields: FIELDS.length,
    keywords: KEYWORDS.length,
    journals: 0,
    conferences: 0,
    specialIssues: 0,
    papers: 0,
  };

  // helper to require a field id
  const fid = (name: string): string => {
    const id = fieldByName.get(name);
    if (!id) throw new Error(`Seed error: unknown field "${name}"`);
    return id;
  };

  // -------------------------------------------------------------------------
  // 4. Journals (>= 10)
  // -------------------------------------------------------------------------
  const journals: Array<{
    slug: string;
    name: string;
    publisher: string;
    issn: string;
    eissn: string;
    field: string;
    scope: string;
    indexing: string[];
    quartile: Quartile;
    impactFactor: number;
    apc: number;
    openAccess: boolean;
    country: string;
    keywords: string[];
  }> = [
      {
        slug: "jml",
        name: "Journal of Machine Learning Advances",
        publisher: "Sample Open Press",
        issn: "1000-0001",
        eissn: "2000-0001",
        field: "Machine Learning",
        scope: "Theoretical and applied advances in machine learning, including deep learning and reinforcement learning.",
        indexing: ["Scopus", "Web of Science"],
        quartile: Quartile.Q1,
        impactFactor: 8.4,
        apc: 1800,
        openAccess: true,
        country: "United States",
        keywords: ["deep learning", "reinforcement learning", "explainability"],
      },
      {
        slug: "tnlp",
        name: "Transactions on Natural Language Processing",
        publisher: "Sample ACL-Like Society",
        issn: "1000-0002",
        eissn: "2000-0002",
        field: "Natural Language Processing",
        scope: "Models and systems for understanding and generating natural language.",
        indexing: ["Scopus", "ACL Anthology"],
        quartile: Quartile.Q1,
        impactFactor: 6.1,
        apc: 0,
        openAccess: true,
        country: "United Kingdom",
        keywords: ["transformers", "text classification", "question answering"],
      },
      {
        slug: "ijcv-sample",
        name: "International Journal of Computer Vision Studies",
        publisher: "Sample Vision Publishers",
        issn: "1000-0003",
        eissn: "2000-0003",
        field: "Computer Vision",
        scope: "Image and video understanding, recognition, and scene analysis.",
        indexing: ["Scopus", "Web of Science", "IEEE"],
        quartile: Quartile.Q1,
        impactFactor: 7.2,
        apc: 2200,
        openAccess: false,
        country: "Germany",
        keywords: ["image segmentation", "object detection"],
      },
      {
        slug: "jcsec",
        name: "Journal of Cybersecurity and Privacy",
        publisher: "Sample Security Press",
        issn: "1000-0004",
        eissn: "2000-0004",
        field: "Cybersecurity",
        scope: "Network security, cryptography, privacy, and intrusion detection.",
        indexing: ["Scopus", "MDPI"],
        quartile: Quartile.Q2,
        impactFactor: 3.8,
        apc: 1200,
        openAccess: true,
        country: "Switzerland",
        keywords: ["intrusion detection", "cryptography"],
      },
      {
        slug: "jse",
        name: "Journal of Empirical Software Engineering",
        publisher: "Sample Springer-Like",
        issn: "1000-0005",
        eissn: "2000-0005",
        field: "Software Engineering",
        scope: "Empirical studies of software construction, testing, and maintenance.",
        indexing: ["Scopus", "Web of Science", "Springer"],
        quartile: Quartile.Q1,
        impactFactor: 4.5,
        apc: 0,
        openAccess: false,
        country: "Netherlands",
        keywords: ["static analysis", "continuous integration"],
      },
      {
        slug: "tochi-sample",
        name: "Transactions on Human-Computer Interaction",
        publisher: "Sample HCI Society",
        issn: "1000-0006",
        eissn: "2000-0006",
        field: "Human-Computer Interaction",
        scope: "Interaction design, usability, and accessibility of computing systems.",
        indexing: ["Scopus", "ACM"],
        quartile: Quartile.Q2,
        impactFactor: 3.1,
        apc: 900,
        openAccess: true,
        country: "United States",
        keywords: ["usability", "accessibility"],
      },
      {
        slug: "bioinf-sample",
        name: "Journal of Computational Bioinformatics",
        publisher: "Sample Life Sciences Press",
        issn: "1000-0007",
        eissn: "2000-0007",
        field: "Bioinformatics",
        scope: "Computational methods for genomics, proteomics, and systems biology.",
        indexing: ["Scopus", "PubMed", "Web of Science"],
        quartile: Quartile.Q2,
        impactFactor: 5.0,
        apc: 1600,
        openAccess: true,
        country: "United Kingdom",
        keywords: ["genomics", "protein folding"],
      },
      {
        slug: "jds-sample",
        name: "Journal of Distributed Systems Engineering",
        publisher: "Sample Systems Press",
        issn: "1000-0008",
        eissn: "2000-0008",
        field: "Distributed Systems",
        scope: "Consensus, replication, fault tolerance, and large-scale coordination.",
        indexing: ["Scopus", "IEEE"],
        quartile: Quartile.Q2,
        impactFactor: 2.9,
        apc: 1000,
        openAccess: false,
        country: "Canada",
        keywords: ["consensus", "fault tolerance"],
      },
      {
        slug: "jdm-sample",
        name: "Journal of Data Management and Engineering",
        publisher: "Sample Data Press",
        issn: "1000-0009",
        eissn: "2000-0009",
        field: "Data Management",
        scope: "Query optimization, data integration, and data governance.",
        indexing: ["Scopus", "ACM", "Web of Science"],
        quartile: Quartile.Q3,
        impactFactor: 2.2,
        apc: 800,
        openAccess: true,
        country: "Australia",
        keywords: ["query optimization", "data integration"],
      },
      {
        slug: "jrob-sample",
        name: "Journal of Autonomous Robotics",
        publisher: "Sample Robotics Press",
        issn: "1000-0010",
        eissn: "2000-0010",
        field: "Robotics",
        scope: "Motion planning, perception, and control of autonomous robots.",
        indexing: ["Scopus", "IEEE", "Web of Science"],
        quartile: Quartile.Q1,
        impactFactor: 6.7,
        apc: 2000,
        openAccess: false,
        country: "Japan",
        keywords: ["motion planning", "sensor fusion"],
      },
      {
        slug: "jfl-sample",
        name: "Journal of Federated and Privacy-Preserving Learning",
        publisher: "Sample Open Press",
        issn: "1000-0011",
        eissn: "2000-0011",
        field: "Machine Learning",
        scope: "Federated learning, privacy-preserving machine learning, and explainability.",
        indexing: ["Scopus", "MDPI"],
        quartile: Quartile.Q2,
        impactFactor: 4.0,
        apc: 1400,
        openAccess: true,
        country: "Singapore",
        keywords: ["federated learning", "explainability", "deep learning"],
      },
    ];

  const journalIdBySlug = new Map<string, string>();
  for (const j of journals) {
    const sourceUrl = `https://example.org/sample/journals/${j.slug}`;
    const rec = await prisma.journal.upsert({
      where: { dataSourceId_sourceUrl: { dataSourceId: dataSource.id, sourceUrl } },
      update: {
        name: j.name,
        publisher: j.publisher,
        issn: j.issn,
        eissn: j.eissn,
        fieldId: fid(j.field),
        scope: j.scope,
        indexing: j.indexing,
        quartile: j.quartile,
        impactFactor: j.impactFactor,
        apc: j.apc,
        openAccess: j.openAccess,
        submissionUrl: `https://example.com/${j.slug}/submit`,
        submissionDeadline: daysFromNow(60),
        country: j.country,
        notes: "Sample journal record — unverified mock data.",
        officialUrl: `https://example.com/journals/${j.slug}`,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { set: j.keywords.map((term) => ({ term })) },
      },
      create: {
        name: j.name,
        publisher: j.publisher,
        issn: j.issn,
        eissn: j.eissn,
        fieldId: fid(j.field),
        scope: j.scope,
        indexing: j.indexing,
        quartile: j.quartile,
        impactFactor: j.impactFactor,
        apc: j.apc,
        openAccess: j.openAccess,
        submissionUrl: `https://example.com/${j.slug}/submit`,
        submissionDeadline: daysFromNow(60),
        country: j.country,
        notes: "Sample journal record — unverified mock data.",
        sourceUrl,
        officialUrl: `https://example.com/journals/${j.slug}`,
        dataSourceId: dataSource.id,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { connect: j.keywords.map((term) => ({ term })) },
      },
    });
    journalIdBySlug.set(j.slug, rec.id);
    counts.journals += 1;
  }

  // -------------------------------------------------------------------------
  // 5. Conferences (>= 10)
  // -------------------------------------------------------------------------
  const conferences: Array<{
    slug: string;
    name: string;
    acronym: string;
    field: string;
    organizer: string;
    location: string;
    country: string;
    mode: ConferenceMode;
    ranking: ConferenceRanking;
    indexing: string[];
    lifecycleStatus: VenueLifecycleStatus;
    submissionInDays: number;
    keywords: string[];
  }> = [
      { slug: "smlc", name: "Sample Machine Learning Conference", acronym: "SMLC", field: "Machine Learning", organizer: "Sample ML Foundation", location: "Boston, MA", country: "United States", mode: ConferenceMode.HYBRID, ranking: ConferenceRanking.CORE_A_STAR, indexing: ["Scopus", "IEEE"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 45, keywords: ["deep learning", "reinforcement learning"] },
      { slug: "snlp", name: "Sample Conference on Natural Language Processing", acronym: "SNLP", field: "Natural Language Processing", organizer: "Sample NLP Society", location: "Dublin", country: "Ireland", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_A, indexing: ["Scopus", "ACL Anthology"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 30, keywords: ["transformers", "question answering"] },
      { slug: "scvpr", name: "Sample Computer Vision and Pattern Recognition", acronym: "SCVPR", field: "Computer Vision", organizer: "Sample Vision Society", location: "Seattle, WA", country: "United States", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_A_STAR, indexing: ["Scopus", "IEEE"], lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 90, keywords: ["object detection", "image segmentation"] },
      { slug: "ssec", name: "Sample Security Conference", acronym: "SSEC", field: "Cybersecurity", organizer: "Sample Security Association", location: "Berlin", country: "Germany", mode: ConferenceMode.HYBRID, ranking: ConferenceRanking.CORE_A, indexing: ["Scopus", "ACM"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 20, keywords: ["intrusion detection", "cryptography"] },
      { slug: "sicse", name: "Sample International Conference on Software Engineering", acronym: "SICSE", field: "Software Engineering", organizer: "Sample SE Institute", location: "Melbourne", country: "Australia", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_A_STAR, indexing: ["Scopus", "ACM", "IEEE"], lifecycleStatus: VenueLifecycleStatus.CLOSED, submissionInDays: -15, keywords: ["static analysis", "continuous integration"] },
      { slug: "schi", name: "Sample Conference on Human Factors in Computing", acronym: "SCHI", field: "Human-Computer Interaction", organizer: "Sample HCI Society", location: "Tokyo", country: "Japan", mode: ConferenceMode.HYBRID, ranking: ConferenceRanking.CORE_A, indexing: ["Scopus", "ACM"], lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 120, keywords: ["usability", "accessibility"] },
      { slug: "sbioc", name: "Sample Bioinformatics Conference", acronym: "SBIOC", field: "Bioinformatics", organizer: "Sample Bio Society", location: "Cambridge", country: "United Kingdom", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_B, indexing: ["Scopus", "PubMed"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 50, keywords: ["genomics", "protein folding"] },
      { slug: "sdisc", name: "Sample Symposium on Distributed Computing", acronym: "SDISC", field: "Distributed Systems", organizer: "Sample Systems Society", location: "Zurich", country: "Switzerland", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_A, indexing: ["Scopus", "IEEE"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 40, keywords: ["consensus", "fault tolerance"] },
      { slug: "sdata", name: "Sample Conference on Data Management", acronym: "SDATA", field: "Data Management", organizer: "Sample Data Society", location: "Toronto", country: "Canada", mode: ConferenceMode.HYBRID, ranking: ConferenceRanking.CORE_B, indexing: ["Scopus", "ACM"], lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 100, keywords: ["query optimization", "data integration"] },
      { slug: "srob", name: "Sample International Conference on Robotics", acronym: "SROB", field: "Robotics", organizer: "Sample Robotics Society", location: "Singapore", country: "Singapore", mode: ConferenceMode.OFFLINE, ranking: ConferenceRanking.CORE_A_STAR, indexing: ["Scopus", "IEEE"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 35, keywords: ["motion planning", "sensor fusion"] },
      { slug: "sfl", name: "Sample Workshop on Federated Learning", acronym: "SFL", field: "Machine Learning", organizer: "Sample ML Foundation", location: "Online", country: "Online", mode: ConferenceMode.ONLINE, ranking: ConferenceRanking.CORE_C, indexing: ["Scopus"], lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 25, keywords: ["federated learning", "explainability"] },
    ];

  for (const c of conferences) {
    const sourceUrl = `https://example.org/sample/conferences/${c.slug}`;
    await prisma.conference.upsert({
      where: { dataSourceId_sourceUrl: { dataSourceId: dataSource.id, sourceUrl } },
      update: {
        name: c.name,
        acronym: c.acronym,
        fieldId: fid(c.field),
        organizer: c.organizer,
        location: c.location,
        country: c.country,
        mode: c.mode,
        submissionDeadline: daysFromNow(c.submissionInDays),
        notificationDate: daysFromNow(c.submissionInDays + 30),
        conferenceDate: daysFromNow(c.submissionInDays + 90),
        ranking: c.ranking,
        indexing: c.indexing,
        cfpUrl: `https://example.com/${c.slug}/cfp`,
        lifecycleStatus: c.lifecycleStatus,
        officialUrl: `https://example.com/conferences/${c.slug}`,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { set: c.keywords.map((term) => ({ term })) },
      },
      create: {
        name: c.name,
        acronym: c.acronym,
        fieldId: fid(c.field),
        organizer: c.organizer,
        location: c.location,
        country: c.country,
        mode: c.mode,
        submissionDeadline: daysFromNow(c.submissionInDays),
        notificationDate: daysFromNow(c.submissionInDays + 30),
        conferenceDate: daysFromNow(c.submissionInDays + 90),
        ranking: c.ranking,
        indexing: c.indexing,
        cfpUrl: `https://example.com/${c.slug}/cfp`,
        lifecycleStatus: c.lifecycleStatus,
        sourceUrl,
        officialUrl: `https://example.com/conferences/${c.slug}`,
        dataSourceId: dataSource.id,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { connect: c.keywords.map((term) => ({ term })) },
      },
    });
    counts.conferences += 1;
  }

  // -------------------------------------------------------------------------
  // 6. Special Issues (>= 10) — each tied to a Journal
  // -------------------------------------------------------------------------
  const specialIssues: Array<{
    slug: string;
    title: string;
    journalSlug: string;
    publisher: string;
    topicScope: string;
    guestEditors: string;
    field: string;
    lifecycleStatus: VenueLifecycleStatus;
    submissionInDays: number;
    keywords: string[];
  }> = [
      { slug: "si-dl-health", title: "Special Issue: Deep Learning for Healthcare", journalSlug: "jml", publisher: "Sample Open Press", topicScope: "Applications of deep learning to clinical and biomedical data.", guestEditors: "A. Sample, B. Example", field: "Machine Learning", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 70, keywords: ["deep learning", "explainability"] },
      { slug: "si-llm-eval", title: "Special Issue: Evaluating Large Language Models", journalSlug: "tnlp", publisher: "Sample ACL-Like Society", topicScope: "Benchmarks and evaluation methodology for language models.", guestEditors: "C. Demo, D. Placeholder", field: "Natural Language Processing", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 55, keywords: ["transformers", "question answering"] },
      { slug: "si-3d-vision", title: "Special Issue: 3D Scene Understanding", journalSlug: "ijcv-sample", publisher: "Sample Vision Publishers", topicScope: "Reconstruction, segmentation, and recognition in 3D.", guestEditors: "E. Mock, F. Sample", field: "Computer Vision", lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 110, keywords: ["image segmentation", "object detection"] },
      { slug: "si-zero-trust", title: "Special Issue: Zero Trust Architectures", journalSlug: "jcsec", publisher: "Sample Security Press", topicScope: "Design and evaluation of zero-trust security models.", guestEditors: "G. Example, H. Demo", field: "Cybersecurity", lifecycleStatus: VenueLifecycleStatus.CLOSED, submissionInDays: -20, keywords: ["intrusion detection", "cryptography"] },
      { slug: "si-devops", title: "Special Issue: Empirical Studies in DevOps", journalSlug: "jse", publisher: "Sample Springer-Like", topicScope: "Continuous integration, delivery, and operations research.", guestEditors: "I. Sample, J. Mock", field: "Software Engineering", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 65, keywords: ["continuous integration", "static analysis"] },
      { slug: "si-a11y", title: "Special Issue: Accessibility in Interactive Systems", journalSlug: "tochi-sample", publisher: "Sample HCI Society", topicScope: "Inclusive and accessible interaction design.", guestEditors: "K. Demo, L. Placeholder", field: "Human-Computer Interaction", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 80, keywords: ["accessibility", "usability"] },
      { slug: "si-single-cell", title: "Special Issue: Single-Cell Genomics Methods", journalSlug: "bioinf-sample", publisher: "Sample Life Sciences Press", topicScope: "Computational methods for single-cell sequencing data.", guestEditors: "M. Sample, N. Example", field: "Bioinformatics", lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 130, keywords: ["genomics", "protein folding"] },
      { slug: "si-blockchain", title: "Special Issue: Consensus at Scale", journalSlug: "jds-sample", publisher: "Sample Systems Press", topicScope: "Scalable consensus and fault-tolerant coordination.", guestEditors: "O. Mock, P. Demo", field: "Distributed Systems", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 48, keywords: ["consensus", "fault tolerance"] },
      { slug: "si-lakehouse", title: "Special Issue: Modern Data Lakehouses", journalSlug: "jdm-sample", publisher: "Sample Data Press", topicScope: "Architectures unifying data warehouses and lakes.", guestEditors: "Q. Sample, R. Example", field: "Data Management", lifecycleStatus: VenueLifecycleStatus.UPCOMING, submissionInDays: 95, keywords: ["query optimization", "data integration"] },
      { slug: "si-field-robots", title: "Special Issue: Field Robotics in the Wild", journalSlug: "jrob-sample", publisher: "Sample Robotics Press", topicScope: "Perception and planning for robots in unstructured environments.", guestEditors: "S. Demo, T. Mock", field: "Robotics", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 60, keywords: ["motion planning", "sensor fusion"] },
      { slug: "si-private-ml", title: "Special Issue: Privacy-Preserving Machine Learning", journalSlug: "jfl-sample", publisher: "Sample Open Press", topicScope: "Federated and differentially private learning systems.", guestEditors: "U. Sample, V. Example", field: "Machine Learning", lifecycleStatus: VenueLifecycleStatus.OPEN, submissionInDays: 75, keywords: ["federated learning", "deep learning"] },
    ];

  for (const s of specialIssues) {
    const sourceUrl = `https://example.org/sample/special-issues/${s.slug}`;
    await prisma.specialIssue.upsert({
      where: { dataSourceId_sourceUrl: { dataSourceId: dataSource.id, sourceUrl } },
      update: {
        title: s.title,
        journalId: journalIdBySlug.get(s.journalSlug) ?? null,
        publisher: s.publisher,
        topicScope: s.topicScope,
        guestEditors: s.guestEditors,
        fieldId: fid(s.field),
        submissionDeadline: daysFromNow(s.submissionInDays),
        publicationTimeline: "Sample timeline: publication ~6 months after acceptance.",
        submissionUrl: `https://example.com/${s.slug}/submit`,
        lifecycleStatus: s.lifecycleStatus,
        officialUrl: `https://example.com/special-issues/${s.slug}`,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { set: s.keywords.map((term) => ({ term })) },
      },
      create: {
        title: s.title,
        journalId: journalIdBySlug.get(s.journalSlug) ?? null,
        publisher: s.publisher,
        topicScope: s.topicScope,
        guestEditors: s.guestEditors,
        fieldId: fid(s.field),
        submissionDeadline: daysFromNow(s.submissionInDays),
        publicationTimeline: "Sample timeline: publication ~6 months after acceptance.",
        submissionUrl: `https://example.com/${s.slug}/submit`,
        lifecycleStatus: s.lifecycleStatus,
        sourceUrl,
        officialUrl: `https://example.com/special-issues/${s.slug}`,
        dataSourceId: dataSource.id,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { connect: s.keywords.map((term) => ({ term })) },
      },
    });
    counts.specialIssues += 1;
  }

  // -------------------------------------------------------------------------
  // 7. Papers (>= 20)
  // -------------------------------------------------------------------------
  const papers: Array<{
    slug: string;
    title: string;
    abstract: string;
    authors: string;
    field: string;
    venueName: string;
    year: number;
    keywords: string[];
  }> = [
      { slug: "p-attn-survey", title: "A Survey of Attention Mechanisms in Deep Learning", abstract: "Attention mechanisms have become central to modern deep learning. This sample paper surveys attention variants, from additive attention to multi-head self-attention in transformers, and discusses their impact on sequence modeling and representation learning.", authors: "A. Author, B. Researcher", field: "Machine Learning", venueName: "Journal of Machine Learning Advances", year: 2023, keywords: ["deep learning", "transformers"] },
      { slug: "p-rl-robotics", title: "Reinforcement Learning for Robotic Manipulation", abstract: "We study sample-efficient reinforcement learning for robotic manipulation tasks. The work combines model-based planning with policy gradients and evaluates motion planning under uncertainty in simulated environments.", authors: "C. Writer, D. Scholar", field: "Machine Learning", venueName: "Sample Machine Learning Conference", year: 2024, keywords: ["reinforcement learning", "motion planning"] },
      { slug: "p-qa-retrieval", title: "Retrieval-Augmented Question Answering", abstract: "This paper explores retrieval-augmented generation for open-domain question answering. We analyze how dense retrieval improves transformer-based answer accuracy and reduces hallucination on factual queries.", authors: "E. Scientist, F. Analyst", field: "Natural Language Processing", venueName: "Transactions on Natural Language Processing", year: 2023, keywords: ["question answering", "transformers", "text classification"] },
      { slug: "p-text-class", title: "Robust Text Classification under Distribution Shift", abstract: "We investigate robustness of text classification models when the input distribution shifts. The study proposes regularization strategies and reports their effect on accuracy and calibration across domains.", authors: "G. Author, H. Editor", field: "Natural Language Processing", venueName: "Sample Conference on Natural Language Processing", year: 2024, keywords: ["text classification", "explainability"] },
      { slug: "p-seg-medical", title: "Image Segmentation for Medical Imaging", abstract: "This sample work applies deep image segmentation to medical scans. We compare encoder-decoder architectures and evaluate segmentation quality on annotated radiology datasets.", authors: "I. Researcher, J. Writer", field: "Computer Vision", venueName: "International Journal of Computer Vision Studies", year: 2022, keywords: ["image segmentation", "deep learning"] },
      { slug: "p-obj-detect", title: "Real-Time Object Detection on Edge Devices", abstract: "We present an efficient object detection pipeline optimized for resource-constrained edge devices, balancing detection accuracy against latency and power consumption.", authors: "K. Scholar, L. Analyst", field: "Computer Vision", venueName: "Sample Computer Vision and Pattern Recognition", year: 2024, keywords: ["object detection", "sensor fusion"] },
      { slug: "p-ids-ml", title: "Machine Learning for Network Intrusion Detection", abstract: "This paper evaluates machine learning classifiers for network intrusion detection. We discuss feature engineering on flow data and the trade-offs between detection rate and false positives.", authors: "M. Author, N. Engineer", field: "Cybersecurity", venueName: "Journal of Cybersecurity and Privacy", year: 2023, keywords: ["intrusion detection", "deep learning"] },
      { slug: "p-crypto-pq", title: "A Practical Look at Post-Quantum Cryptography", abstract: "We review lattice-based cryptographic schemes and their performance characteristics, focusing on practical deployment considerations for post-quantum cryptography.", authors: "O. Writer, P. Scientist", field: "Cybersecurity", venueName: "Sample Security Conference", year: 2024, keywords: ["cryptography"] },
      { slug: "p-static-bugs", title: "Static Analysis for Detecting Concurrency Bugs", abstract: "This study presents a static analysis technique for detecting concurrency defects in large codebases and reports empirical results on open-source projects.", authors: "Q. Researcher, R. Author", field: "Software Engineering", venueName: "Journal of Empirical Software Engineering", year: 2022, keywords: ["static analysis", "fault tolerance"] },
      { slug: "p-ci-flaky", title: "Understanding Flaky Tests in Continuous Integration", abstract: "We conduct an empirical study of flaky tests in continuous integration pipelines, categorizing root causes and proposing mitigation strategies for reliable builds.", authors: "S. Scholar, T. Editor", field: "Software Engineering", venueName: "Sample International Conference on Software Engineering", year: 2023, keywords: ["continuous integration", "static analysis"] },
      { slug: "p-usability-vr", title: "Usability of Virtual Reality Interfaces", abstract: "This sample paper measures usability of virtual reality interfaces through controlled user studies and reports findings on comfort, learnability, and task completion.", authors: "U. Author, V. Writer", field: "Human-Computer Interaction", venueName: "Transactions on Human-Computer Interaction", year: 2023, keywords: ["usability", "accessibility"] },
      { slug: "p-a11y-mobile", title: "Improving Accessibility of Mobile Applications", abstract: "We analyze accessibility barriers in mobile applications and propose design guidelines that improve access for users relying on assistive technologies.", authors: "W. Researcher, X. Scientist", field: "Human-Computer Interaction", venueName: "Sample Conference on Human Factors in Computing", year: 2024, keywords: ["accessibility", "usability"] },
      { slug: "p-genomics-dl", title: "Deep Learning Models for Genomic Sequence Analysis", abstract: "This work applies deep learning to genomic sequence analysis, predicting regulatory elements and discussing interpretability of learned genomic features.", authors: "Y. Writer, Z. Analyst", field: "Bioinformatics", venueName: "Journal of Computational Bioinformatics", year: 2023, keywords: ["genomics", "deep learning"] },
      { slug: "p-protein-struct", title: "Predicting Protein Structures with Graph Neural Networks", abstract: "We model protein structures using graph neural networks and evaluate prediction quality of folding configurations against reference structures.", authors: "A. Scientist, B. Scholar", field: "Bioinformatics", venueName: "Sample Bioinformatics Conference", year: 2024, keywords: ["protein folding", "graph neural networks"] },
      { slug: "p-consensus-bft", title: "Byzantine Fault Tolerant Consensus Revisited", abstract: "This paper revisits Byzantine fault tolerant consensus protocols, analyzing their latency and throughput under varying network conditions and failure models.", authors: "C. Author, D. Engineer", field: "Distributed Systems", venueName: "Journal of Distributed Systems Engineering", year: 2022, keywords: ["consensus", "fault tolerance"] },
      { slug: "p-replication", title: "Geo-Replication Strategies for Cloud Databases", abstract: "We compare geo-replication strategies for cloud databases, focusing on consistency guarantees, fault tolerance, and the impact on read and write latency.", authors: "E. Researcher, F. Writer", field: "Distributed Systems", venueName: "Sample Symposium on Distributed Computing", year: 2023, keywords: ["fault tolerance", "consensus"] },
      { slug: "p-query-opt", title: "Learned Query Optimization for Analytical Workloads", abstract: "This sample study applies learning-based methods to query optimization for analytical workloads and reports improvements in plan quality over traditional optimizers.", authors: "G. Scholar, H. Analyst", field: "Data Management", venueName: "Journal of Data Management and Engineering", year: 2024, keywords: ["query optimization", "deep learning"] },
      { slug: "p-data-integration", title: "Schema Matching for Large-Scale Data Integration", abstract: "We present schema matching techniques for large-scale data integration, evaluating accuracy of automated mappings across heterogeneous sources.", authors: "I. Author, J. Scientist", field: "Data Management", venueName: "Sample Conference on Data Management", year: 2023, keywords: ["data integration", "query optimization"] },
      { slug: "p-motion-plan", title: "Sampling-Based Motion Planning in Dynamic Scenes", abstract: "This work studies sampling-based motion planning for robots operating in dynamic scenes, integrating sensor fusion to update plans in real time.", authors: "K. Writer, L. Engineer", field: "Robotics", venueName: "Journal of Autonomous Robotics", year: 2023, keywords: ["motion planning", "sensor fusion"] },
      { slug: "p-sensor-fusion", title: "Multi-Sensor Fusion for Autonomous Navigation", abstract: "We propose a multi-sensor fusion framework for autonomous navigation, combining lidar and camera data to improve localization robustness.", authors: "M. Scholar, N. Researcher", field: "Robotics", venueName: "Sample International Conference on Robotics", year: 2024, keywords: ["sensor fusion", "motion planning"] },
      { slug: "p-federated", title: "Communication-Efficient Federated Learning", abstract: "This paper introduces communication-efficient federated learning methods that reduce bandwidth while preserving model accuracy across distributed clients.", authors: "O. Author, P. Writer", field: "Machine Learning", venueName: "Journal of Federated and Privacy-Preserving Learning", year: 2024, keywords: ["federated learning", "deep learning"] },
      { slug: "p-explainable", title: "Explainable Machine Learning for High-Stakes Decisions", abstract: "We survey explainability methods for machine learning models used in high-stakes decisions, comparing feature attribution and example-based explanations.", authors: "Q. Scientist, R. Scholar", field: "Machine Learning", venueName: "Sample Workshop on Federated Learning", year: 2023, keywords: ["explainability", "deep learning"] },
    ];

  for (const p of papers) {
    const sourceUrl = `https://example.org/sample/papers/${p.slug}`;
    await prisma.paper.upsert({
      where: { dataSourceId_sourceUrl: { dataSourceId: dataSource.id, sourceUrl } },
      update: {
        title: p.title,
        abstract: p.abstract,
        authors: p.authors,
        fieldId: fid(p.field),
        venueName: p.venueName,
        year: p.year,
        doi: `10.0000/sample.${p.slug}`,
        officialUrl: `https://example.com/papers/${p.slug}`,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { set: p.keywords.map((term) => ({ term })) },
      },
      create: {
        title: p.title,
        abstract: p.abstract,
        authors: p.authors,
        fieldId: fid(p.field),
        venueName: p.venueName,
        year: p.year,
        doi: `10.0000/sample.${p.slug}`,
        sourceUrl,
        officialUrl: `https://example.com/papers/${p.slug}`,
        dataSourceId: dataSource.id,
        verificationStatus: VerificationStatus.UNVERIFIED_MOCK,
        lastCheckedAt: NOW,
        keywords: { connect: p.keywords.map((term) => ({ term })) },
      },
    });
    counts.papers += 1;
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("Seed complete (UNVERIFIED_MOCK sample data):");
  console.table(counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
