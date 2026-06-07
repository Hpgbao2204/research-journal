# Implementation Plan: PaperScout AI

## Overview

This plan converts the PaperScout AI design into incremental, code-only tasks organized to map directly onto the approved 13-milestone enterprise commit plan. Each task builds on the previous ones and ends with wiring the new code into the running app, so no orphaned code is left behind.

The technology stack is Next.js (App Router) + TypeScript + Tailwind + Shadcn UI on the frontend, React Hook Form + Zod for forms/validation, Next.js Route Handlers + a TypeScript service layer on the backend, and Prisma + PostgreSQL for persistence.

Property-based testing (`fast-check`, 100+ iterations per property) is the primary strategy for pure logic (search filtering, validation, scoring, ordering, normalization, provenance, persistence round-trips). Unit/example, integration, and smoke tests cover UI rendering, route handlers, and configuration concerns. Each test task references the design property or requirement it validates.

Milestone references in task titles map each task group to the approved commit plan (Commit milestone 1–13).

## Tasks

- [ ] 1. Initialize project foundation (Commit milestone 1)
  - [ ] 1.1 Scaffold Next.js + TypeScript + Tailwind + Shadcn UI project
    - Create the Next.js App Router project with TypeScript and strict mode
    - Configure Tailwind CSS and initialize Shadcn UI with base components (button, input, card, badge, table, form, select)
    - Establish the `src/` directory layout: `src/app`, `src/lib/services`, `src/lib/schemas`, `src/lib/ingestion`, `src/lib/db`
    - Add `package.json` scripts: `dev`, `build`, `lint`, `tsc --noEmit`, `test`
    - _Requirements: 16.4_

  - [ ] 1.2 Add version-control and environment configuration files
    - Add `.gitignore` excluding `.env`, `.env.local`, `node_modules`, `.next`, and build artifacts
    - Add `.env.example` documenting `DATABASE_URL`, `AI_API_KEY` (optional), `AI_API_BASE_URL`, `AI_MODEL` with placeholder values only and no secrets
    - _Requirements: 15.4, 15.5, 16.3_

- [ ] 2. Define data model and Prisma setup (Commit milestone 2)
  - [ ] 2.1 Author the Prisma schema for all models with provenance fields
    - Define enums: `VerificationStatus`, `SpecialIssueStatus`, `ConferenceMode`, `ConferenceRanking`, `Quartile`, `VenueType`, `RecommendationMethod`
    - Define models: `DataSource`, `Field`, `Keyword`, `Journal`, `Conference`, `SpecialIssue`, `Paper`, `RecommendationResult`, `RecommendationItem`
    - Apply provenance fields (`sourceUrl`, `officialUrl` where defined, `dataSourceId`, status, `metadata`, `createdAt`, `updatedAt`, `lastCheckedAt`) to every venue/paper model
    - Add `@@unique([dataSourceId, sourceUrl])` duplicate-detection key to each venue/paper model
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 14.4_

  - [ ] 2.2 Configure the Prisma client singleton and migration tooling
    - Create a shared Prisma client module (`src/lib/db/prisma.ts`) with a single instance for reuse
    - Add migration and generate scripts (`prisma migrate dev`, `prisma generate`) and wire them into `package.json`
    - Generate the initial migration from the schema
    - _Requirements: 16.4_

- [ ] 3. Implement seed data (Commit milestone 3)
  - [ ] 3.1 Implement the idempotent seed script
    - Create at least 10 Journals, 10 Conferences, 10 Special Issues, and 20 Papers, each tied to a sample `DataSource`
    - Populate `sourceUrl` and `officialUrl` and set `status = UNVERIFIED_MOCK` on every venue record
    - Use upsert keyed on `[dataSourceId, sourceUrl]` so re-running the seed does not create duplicates
    - Wire the script into `package.json` (`prisma db seed` / `npm run seed`)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 10.4_

- [ ] 4. Build shared schemas, core read API, and central error handling (Commit milestone 4)
  - [ ] 4.1 Implement shared Zod schemas
    - Implement `VenueTypeSchema`, `AnalyzeRequestSchema`, `RecommendationItemSchema`, `AnalysisResultSchema`, `SearchParamsSchema` (with the `apcMin <= apcMax` refinement) in `src/lib/schemas`
    - Define DTO shapes (`JournalDTO`, `ConferenceDTO`, `SpecialIssueDTO`, `SearchResults`, `RecommendationResultDTO`, `SavedRecommendationDTO`) and the `isUnverified` computed flag
    - Ensure schemas are importable by both client (React Hook Form) and server
    - _Requirements: 13.7, 15.1, 6.1_

  - [ ] 4.2 Implement central error handling, logger, and route wrapper
    - Define typed errors `ValidationError`, `NotFoundError`, `AppError`
    - Implement a `handleRoute(fn)` wrapper that maps validation → 400, not-found → 404, internal → 500 with structured bodies
    - Implement a logger abstraction that records operation name and sanitized context and never logs secrets
    - _Requirements: 13.7, 15.3_

  - [ ] 4.3 Implement the Search Service and `GET /api/search`
    - Implement `SearchService.search(params)` applying content-type, field, indexing, open access, APC range, quartile, publisher/organizer, country/region, submission-deadline range, and conference-date range filters across Papers/Journals/Conferences/Special Issues
    - Match keyword query against name, title, scope, and keyword fields
    - Map results to DTOs carrying the data-source label and unverified indicator; return empty result set when nothing matches
    - Wire `GET /api/search` through `handleRoute` with `SearchParamsSchema` validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 13.1, 13.7_

  - [ ] 4.4 Implement venue list/detail services and GET endpoints
    - Implement list/detail service methods for Journals, Conferences, and Special Issues returning resolved DTOs
    - Wire `GET /api/journals`, `/api/conferences`, `/api/special-issues` (lists) and `/[id]` (details) returning 404 via `NotFoundError` when an id does not exist
    - _Requirements: 13.2, 13.3, 3.1, 3.2, 4.1, 4.3, 5.1, 5.4_

- [ ] 5. Checkpoint - data layer and read API
  - Ensure the schema migrates, the seed runs idempotently, and the search/venue endpoints return validated DTOs. Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Build app layout and core pages (Commit milestone 5)
  - [ ] 6.1 Implement root layout, navigation, and shared provenance components
    - Implement the root layout with global navigation linking to Search, Journals, Conferences, Special Issues, and the Analyzer
    - Implement `DataSourceBadge` (source label + "Unverified sample data" indicator) and `FieldValue` (explicit missing/unverified indicator for null/unverified fields)
    - Implement a reusable mock-data notice component
    - _Requirements: 1.3, 2.15, 3.3, 4.4, 5.5, 10.3_

  - [ ] 6.2 Implement the landing page
    - Render the product introduction covering paper/journal/special-issue/conference discovery and abstract-based recommendation
    - Add the primary CTA navigating to the Analyzer and nav links to Search/Journals/Conferences/Special Issues
    - Render the unverified-mock-data notice
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 6.3 Implement venue list and detail pages
    - Implement `/journals`, `/conferences`, `/special-issues` list pages consuming the list endpoints with the mock-data notice and `DataSourceBadge`
    - Implement `/journals/[id]`, `/conferences/[id]`, `/special-issues/[id]` detail pages rendering all specified fields via `FieldValue`, the official-website control, status values, and not-found UI
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Build search and filter UI (Commit milestone 6)
  - [ ] 7.1 Implement the search page with filters and state handling
    - Build the `/search` page with controls for all filters validated against `SearchParamsSchema`
    - Render results with `DataSourceBadge`, and implement empty-state, loading, and error states
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.15_

- [ ] 8. Build abstract analyzer input page (Commit milestone 7)
  - [ ] 8.1 Implement the analyzer form with React Hook Form + Zod
    - Build the `/analyze` page form accepting title, abstract, keywords, field, preferred venue type, preferred indexing, preferred deadline range, and open-access preference
    - Validate inputs with `AnalyzeRequestSchema` before submit; show the required-abstract and max-length messages and loading/error states
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Implement the AI recommendation service (Commit milestone 8)
  - [ ] 9.1 Implement deterministic analysis extraction
    - Implement `extractAnalysis(request)` producing main topic, subfield, methodology, contribution type, extracted keywords, and suitable disciplines via tokenizer + stopword filter + field-keyword mapping
    - _Requirements: 7.1, 8.4_

  - [ ] 9.2 Implement candidate venue querying
    - Implement `queryCandidates(request)` loading venues from the DB and applying the preferred venue type filter; candidates are the only universe recommendations may draw from
    - _Requirements: 6.5, 7.2, 10.4_

  - [ ] 9.3 Implement the AI provider client and prompt template
    - Implement `AiClient` with `isConfigured()` and `complete(prompt, signal)` using an `AbortSignal` timeout
    - Implement the prompt template instructing the model to choose only supplied candidate IDs and return JSON matching `AnalysisResultSchema`
    - _Requirements: 7.1, 7.4, 8.1, 8.2, 15.2_

  - [ ] 9.4 Implement the rule-based fallback scoring
    - Implement the weighted/normalized integer `matchScore` in [0,100] from keyword overlap, field match, deadline availability, and indexing match
    - Return the identical `AnalysisResult` shape as the AI path with `method = "RULE_BASED"`; keep the function pure and deterministic
    - _Requirements: 8.3, 8.4, 7.3_

  - [ ] 9.5 Implement the recommendation orchestrator and `POST /api/analyze-abstract`
    - Validate input with `AnalyzeRequestSchema`; on AI mode pass output through `AnalysisResultSchema.safeParse` and route to fallback on failure/timeout/error (no unhandled exception); discard non-conforming AI output without persisting
    - Derive per-venue warnings for missing/unverified fields, sort items by descending match score, set the method indicator to the method actually used, and persist `RecommendationResult` + `RecommendationItem`
    - Return a recommendation error without persistence only when even the fallback cannot produce a schema-valid result
    - Wire `POST /api/analyze-abstract` through `handleRoute`
    - _Requirements: 6.5, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.1, 8.2, 8.5, 9.1, 13.4, 15.2_

  - [ ] 9.6 Implement recommendation retrieval and `GET /api/recommendations/[id]`
    - Implement `getById(id)` returning the persisted analysis and ordered items, or not-found
    - Wire `GET /api/recommendations/[id]` through `handleRoute`
    - _Requirements: 9.2, 9.3, 13.5_

- [ ] 10. Checkpoint - recommendation pipeline
  - Ensure the analyzer endpoint returns schema-valid results via both AI-stub and fallback paths and persists them. Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Build recommendation result and saved pages (Commit milestone 9)
  - [ ] 11.1 Implement the recommendation result page
    - Build `/recommendations/[id]` rendering the analysis, each item's reason/scope/deadline/indexing/submission URL/warnings/match score, the suggested abstract and title improvements, the method indicator, and not-found UI
    - _Requirements: 7.4, 7.5, 7.6, 8.5, 9.2, 9.3_

  - [ ] 11.2 Implement saved recommendations service, endpoints, and page
    - Implement `save(id)` and `listSaved()` in the recommendation service
    - Wire `POST /api/saved-recommendations` and `GET /api/saved-recommendations` (no auth required) and build the `/saved` list page
    - _Requirements: 9.1, 9.4, 9.5_

- [ ] 12. Build admin data manager and seed endpoint (Commit milestone 10)
  - [ ] 12.1 Implement the admin service (separated module) and `POST /api/admin/seed`
    - Implement `AdminService.seed()` (runs the seed script, returns created counts) and `listAll()` in a module separated from public functionality to support future auth (`src/lib/services/admin-service.ts`, `app/api/admin/**`)
    - Wire `POST /api/admin/seed` through `handleRoute`
    - _Requirements: 12.2, 12.3, 13.6_

  - [ ] 12.2 Implement the admin data management page
    - Build `/admin/data` listing Journals, Conferences, and Special Issues and a control that triggers the seed endpoint and shows the created counts
    - _Requirements: 12.1, 12.2_

- [ ] 13. Build the data ingestion module skeleton (Commit milestone 11)
  - [ ] 13.1 Implement source normalization and the normalized-record schema
    - Define the `NormalizedVenueRecord` Zod schema and implement the pure, idempotent `normalize(raw)` mapping arbitrary raw fields to it
    - _Requirements: 14.3_

  - [ ] 13.2 Implement import, upsert, last-checked updates, and crawler stub
    - Implement `upsertBySourceUrl` using the `[dataSourceId, sourceUrl]` key to update existing records rather than duplicate
    - Implement `importCsv` and `importJson` running each record through `normalize` then upsert with a `DataSource` reference, updating `lastCheckedAt = now()` on every import/recheck
    - Add the stubbed `fetchAndParse(sourceConfig)` returning `RawVenueRecord[]` for the future crawler (no crawler logic, no fabricated records)
    - _Requirements: 14.1, 14.2, 14.4, 14.5_

- [ ] 14. Implement property-based and supporting tests (Commit milestone 12)
  - [ ]* 14.1 Set up the test harness, generators, and fakes
    - Configure the runner with `fast-check` at 100+ iterations per property
    - Implement an in-memory fake Prisma, a configurable `fakeAiClient` (valid/malformed/schema-invalid/throw/timeout), and generators `arbVenue`/`arbJournal`/`arbConference`/`arbSpecialIssue`/`arbAbstractRequest`/`arbFilters` (including null/unverified-field and boundary-abstract cases)
    - _Requirements: 15.1_

  - [ ]* 14.2 Write property test for search filter soundness
    - `// Feature: paperscout-ai, Property 1: Filter soundness`
    - **Property 1: Filter soundness** — every returned record satisfies all applied filter predicates
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12**

  - [ ]* 14.3 Write property test for keyword match soundness and completeness
    - `// Feature: paperscout-ai, Property 2: Keyword match soundness and completeness`
    - **Property 2: Keyword match soundness and completeness** — returned set is exactly the records matching the query in name/title/scope/keyword
    - **Validates: Requirements 2.3**

  - [ ]* 14.4 Write property test for provenance label in presentation
    - `// Feature: paperscout-ai, Property 3: Result presentation carries provenance label`
    - **Property 3: Result presentation carries provenance label** — unverified-mock DTOs include the source label and unverified indicator
    - **Validates: Requirements 2.15**

  - [ ]* 14.5 Write property test for missing/unverified field flagging
    - `// Feature: paperscout-ai, Property 4: Missing or unverified fields are flagged`
    - **Property 4: Missing or unverified fields are flagged** — every null/unverified field is marked in the detail presentation
    - **Validates: Requirements 3.3, 4.4, 5.5**

  - [ ]* 14.6 Write property test for analyzer input validation
    - `// Feature: paperscout-ai, Property 5: Analyzer input validation`
    - **Property 5: Analyzer input validation** — `AnalyzeRequestSchema` accepts iff all field constraints hold; invalid requests rejected
    - **Validates: Requirements 6.2, 2.14, 13.7, 15.1**

  - [ ]* 14.7 Write property test for empty/over-length abstract rejection
    - `// Feature: paperscout-ai, Property 6: Empty and over-length abstracts are rejected`
    - **Property 6: Empty and over-length abstracts are rejected (edge case)** — empty/whitespace and over-max abstracts rejected with the corresponding message
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 14.8 Write property test for preferred venue type restriction
    - `// Feature: paperscout-ai, Property 7: Preferred venue type restricts recommendations`
    - **Property 7: Preferred venue type restricts recommendations** — every item has the requested venue type
    - **Validates: Requirements 6.5**

  - [ ]* 14.9 Write property test for grounded recommendations
    - `// Feature: paperscout-ai, Property 8: Recommendations are grounded in the database`
    - **Property 8: Recommendations are grounded in the database** — every item references a candidate-set venue id
    - **Validates: Requirements 7.2, 10.4**

  - [ ]* 14.10 Write property test for match score range
    - `// Feature: paperscout-ai, Property 9: Match score is an integer in [0, 100]`
    - **Property 9: Match score is an integer in [0, 100]** — every item's matchScore is an integer in [0,100]
    - **Validates: Requirements 7.3**

  - [ ]* 14.11 Write property test for result and item completeness
    - `// Feature: paperscout-ai, Property 10: Result and item completeness`
    - **Property 10: Result and item completeness** — populated analysis, suggested abstract/title, and per-item reason/scope/deadline/indexing/submission URL
    - **Validates: Requirements 7.1, 7.4, 7.6**

  - [ ]* 14.12 Write property test for missing-field warnings
    - `// Feature: paperscout-ai, Property 11: Missing venue fields produce identifying warnings`
    - **Property 11: Missing venue fields produce identifying warnings** — each missing/unverified venue field yields an identifying warning
    - **Validates: Requirements 7.5**

  - [ ]* 14.13 Write property test for schema conformance of results
    - `// Feature: paperscout-ai, Property 12: Result conforms to the analysis schema`
    - **Property 12: Result conforms to the analysis schema** — AI and fallback results both validate against `AnalysisResultSchema`
    - **Validates: Requirements 7.7, 8.4**

  - [ ]* 14.14 Write property test for rejecting non-conforming AI output
    - `// Feature: paperscout-ai, Property 13: Non-conforming AI output is rejected and not persisted`
    - **Property 13: Non-conforming AI output is rejected and not persisted** — invalid AI output discarded, request resolves via fallback or returns an error
    - **Validates: Requirements 7.8**

  - [ ]* 14.15 Write property test for descending match-score ordering
    - `// Feature: paperscout-ai, Property 14: Recommendation items are ordered by descending match score`
    - **Property 14: Recommendation items are ordered by descending match score**
    - **Validates: Requirements 7.9**

  - [ ]* 14.16 Write property test for method selection and resilience
    - `// Feature: paperscout-ai, Property 15: Method selection and resilience`
    - **Property 15: Method selection and resilience** — no key / AI failure / timeout resolves via fallback with a matching method indicator and no unhandled exception
    - **Validates: Requirements 8.1, 8.2, 8.5, 15.2**

  - [ ]* 14.17 Write property test for fallback determinism and monotonicity
    - `// Feature: paperscout-ai, Property 16: Fallback scoring determinism and monotonicity`
    - **Property 16: Fallback scoring determinism and monotonicity** — identical inputs give identical scores; increasing keyword overlap (other signals fixed) does not decrease score
    - **Validates: Requirements 8.3**

  - [ ]* 14.18 Write property test for recommendation persistence round trip
    - `// Feature: paperscout-ai, Property 17: Recommendation persistence round trip`
    - **Property 17: Recommendation persistence round trip** — persist then retrieve yields equivalent analysis and ordered items
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 14.19 Write property test for venue provenance invariant
    - `// Feature: paperscout-ai, Property 18: Venue provenance invariant`
    - **Property 18: Venue provenance invariant** — created venues have non-empty source/official URLs, an existing DataSource, a populated lastCheckedAt, and unverified-mock status for sample data
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5, 11.2, 11.3**

  - [ ]* 14.20 Write property test for seed idempotence
    - `// Feature: paperscout-ai, Property 19: Seed idempotence`
    - **Property 19: Seed idempotence** — seeding twice does not change venue counts for the same source
    - **Validates: Requirements 11.4**

  - [ ]* 14.21 Write property test for import round trip with data source reference
    - `// Feature: paperscout-ai, Property 20: Import round trip with data source reference`
    - **Property 20: Import round trip with data source reference** — CSV/JSON imports persist records equivalent to normalized inputs, each linked to the data source
    - **Validates: Requirements 14.1, 14.2**

  - [ ]* 14.22 Write property test for normalization conformance and idempotence
    - `// Feature: paperscout-ai, Property 21: Source normalization conforms to schema and is idempotent`
    - **Property 21: Source normalization conforms to schema and is idempotent** — normalize output conforms to schema and re-normalizing yields an equal result
    - **Validates: Requirements 14.3**

  - [ ]* 14.23 Write property test for duplicate-detection update behavior
    - `// Feature: paperscout-ai, Property 22: Import duplicate detection updates rather than duplicates`
    - **Property 22: Import duplicate detection updates rather than duplicates** — re-importing same source+sourceUrl updates the record without increasing count
    - **Validates: Requirements 14.4**

  - [ ]* 14.24 Write property test for last-checked advancement
    - `// Feature: paperscout-ai, Property 23: Import and recheck advance the last-checked timestamp`
    - **Property 23: Import and recheck advance the last-checked timestamp** — lastCheckedAt after import/recheck >= its prior value
    - **Validates: Requirements 14.5**

  - [ ]* 14.25 Write integration tests for route handlers
    - Exercise each endpoint end-to-end against a test database with representative inputs, including analyze with working and failing AI stubs and a DB-failure injection
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 15.3_

  - [ ]* 14.26 Write unit/example tests for pages and seed counts
    - Cover landing-page content, detail-page field rendering and not-found cases, empty-state messaging, saved-recommendation flow, and seed minimum counts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.13, 3.1, 3.4, 4.1, 4.2, 5.1, 5.4, 9.3, 9.4, 9.5, 11.1_

  - [ ]* 14.27 Write smoke/structural tests for configuration
    - Verify admin module separation, absence of secrets in client code, presence of `.env.example`, `.gitignore` entries, required README sections incl. the unverified-mock-data statement, and that documented setup boots and serves the landing page
    - _Requirements: 12.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4_

- [ ] 15. Checkpoint - verification gate
  - Run the full test suite (unit + property at configured iterations + integration), `npm run lint`, and `tsc --noEmit`. Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Documentation and final cleanup (Commit milestone 13)
  - [ ] 16.1 Write the README
    - Document install, environment setup, database migration, seed, and run steps, and explicitly state that included venue data is unverified sample mock data
    - _Requirements: 16.1, 16.2_

  - [ ] 16.2 Final cleanup and verification
    - Remove temporary/dead code, confirm no secrets in client bundles or VCS, and confirm the documented setup serves the landing page
    - _Requirements: 15.4, 16.3, 16.4_

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Property-based tests (Properties 1–23) are the primary strategy for pure logic and each references its design property and validated requirements; unit/integration/smoke tests cover UI, route handlers, and configuration.
- Each task references specific requirements for traceability, and each milestone maps to the approved enterprise commit plan (Commit milestone 1–13).
- Checkpoints provide incremental verification at the data-layer, recommendation-pipeline, and pre-documentation boundaries.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "4.1", "4.2", "6.1"] },
    { "id": 2, "tasks": ["2.2", "6.2"] },
    { "id": 3, "tasks": ["3.1", "4.3", "4.4", "8.1", "9.1", "9.2", "9.3", "13.1"] },
    { "id": 4, "tasks": ["6.3", "7.1", "9.4", "13.2", "12.1"] },
    { "id": 5, "tasks": ["9.5"] },
    { "id": 6, "tasks": ["9.6", "12.2"] },
    { "id": 7, "tasks": ["11.1", "11.2", "14.1"] },
    { "id": 8, "tasks": ["14.2", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.10", "14.11", "14.12", "14.13", "14.14", "14.15", "14.16", "14.17", "14.18", "14.19", "14.20", "14.21", "14.22", "14.23", "14.24", "14.25", "14.26", "16.1"] },
    { "id": 9, "tasks": ["14.27"] },
    { "id": 10, "tasks": ["16.2"] }
  ]
}
```
