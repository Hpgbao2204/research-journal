# Requirements Document

## Introduction

PaperScout AI is a full-stack web application (MVP) that helps researchers discover and select academic venues. The platform lets users search academic papers, multi-disciplinary journals, journal Special Issues / Calls for Papers, and upcoming conferences. Its signature capability is an Abstract Analyzer: a user pastes a paper title and abstract, and an AI recommendation service analyzes the content and recommends suitable journals, conferences, and special issues, each with a reason, match score, scope alignment, deadlines, indexing, submission URL, warnings, and suggested abstract/title improvements.

A core, non-negotiable principle of this system is data integrity: the application MUST NOT fabricate journal, conference, or special-issue data. Until real data sources are integrated, the system uses clearly labeled mock/sample data. Every venue record carries a source URL, official URL, and data-source reference so real data can be crawled or imported later, and the UI and README label sample data as unverified mock data.

The MVP is built with Next.js (App Router) + TypeScript + Tailwind CSS + Shadcn UI on the frontend, React Hook Form with Zod validation, Next.js API route handlers on the backend, Prisma ORM with PostgreSQL for persistence, and an AI recommendation service with a deterministic rule-based fallback.

## Glossary

- **System**: The PaperScout AI web application, including its frontend, API route handlers, and data layer.
- **AI_Recommendation_Service**: The backend component that analyzes an abstract and produces structured venue recommendations, using an external AI API when configured or a rule-based algorithm otherwise.
- **Rule_Based_Fallback**: The deterministic recommendation algorithm based on keyword overlap, field match, deadline availability, and indexing match, used when no AI API key is configured or the AI API fails.
- **Search_Service**: The backend component that queries Papers, Journals, Special Issues, and Conferences with filters.
- **Abstract_Analyzer**: The frontend page and workflow where a user submits paper details and receives recommendations.
- **Admin_Service**: The backend component that manages data and runs the seed operation.
- **Seed_Script**: The script that populates the database with labeled sample data.
- **Ingestion_Module**: The `src/lib/ingestion` code module providing skeletons for CSV import, JSON import, future crawling, source normalization, duplicate detection, and last-checked updates.
- **Venue**: A Journal, Conference, or Special Issue that a paper can be submitted to.
- **Paper**: An academic paper record in the database.
- **Journal**: A multi-disciplinary or field-specific academic journal record.
- **Special_Issue**: A themed call for papers associated with a Journal.
- **Conference**: An academic conference record with submission and event dates.
- **Field**: A research field or discipline classification.
- **Keyword**: A topical keyword associated with papers, venues, or analysis results.
- **Recommendation_Result**: A persisted record of one Abstract Analyzer run, including extracted analysis and a set of Recommendation Items.
- **Recommendation_Item**: A single recommended Venue within a Recommendation Result, including match score and reason.
- **Data_Source**: A record describing the origin of imported or sample data, including its name and reliability label.
- **Match_Score**: An integer from 0 to 100 indicating how well a Venue matches a submitted abstract.
- **Indexing**: An abstracting/indexing service such as Scopus, Web of Science, IEEE, ACM, Springer, Elsevier, MDPI, Frontiers, or Taylor & Francis.
- **Quartile**: A journal ranking value of Q1, Q2, Q3, or Q4.
- **APC**: Article Processing Charge, the fee for open access publication.
- **CFP**: Call for Papers.
- **Mock_Data**: Sample data that is not verified against an authoritative source and is labeled as such.
- **Saved_Recommendation**: A Recommendation Result that a user has chosen to save for later reference.

## Requirements

### Requirement 1: Landing Page

**User Story:** As a visitor, I want a landing page that introduces the product and points me to the abstract analyzer, so that I understand the platform and can start quickly.

#### Acceptance Criteria

1. WHEN a visitor navigates to the home route, THE System SHALL display a product introduction describing paper, journal, special issue, and conference discovery and abstract-based recommendation.
2. THE System SHALL display a primary call-to-action control on the landing page that navigates to the Abstract Analyzer page.
3. THE System SHALL display navigation controls on the landing page that link to the Search page, Journals, Conferences, and Special Issues.
4. THE System SHALL display a notice on the landing page stating that venue data is sample mock data that is not verified.

### Requirement 2: Unified Search

**User Story:** As a researcher, I want to search across papers, journals, special issues, and conferences with rich filters, so that I can find relevant venues and references.

#### Acceptance Criteria

1. WHEN a user submits a search query through the Search page, THE Search_Service SHALL return matching results across Papers, Journals, Special Issues, and Conferences.
2. WHERE a user selects a content type of Papers, Journals, Special Issues, or Conferences, THE Search_Service SHALL restrict results to the selected content type.
3. WHEN a user provides a keyword query, THE Search_Service SHALL match the query against the name, title, scope, and keyword fields of records.
4. WHERE a user applies a field or discipline filter, THE Search_Service SHALL return only records associated with the selected field.
5. WHERE a user applies an indexing filter, THE Search_Service SHALL return only records whose indexing includes the selected indexing service.
6. WHERE a user applies an open access filter, THE Search_Service SHALL return only records matching the selected open access status.
7. WHERE a user applies an APC range filter with a minimum and maximum value, THE Search_Service SHALL return only records whose APC falls within the inclusive range.
8. WHERE a user applies a quartile filter, THE Search_Service SHALL return only Journal records whose quartile matches the selected value.
9. WHERE a user applies a publisher or organizer filter, THE Search_Service SHALL return only records whose publisher or organizer matches the selected value.
10. WHERE a user applies a country or region filter, THE Search_Service SHALL return only records whose country or region matches the selected value.
11. WHERE a user applies a submission deadline range filter, THE Search_Service SHALL return only records whose submission deadline falls within the selected date range.
12. WHERE a user applies a conference date range filter, THE Search_Service SHALL return only Conference records whose conference date falls within the selected date range.
13. WHEN a search returns no matching records, THE Search_Service SHALL return an empty result set and THE System SHALL display an empty-state message.
14. IF a search request contains invalid filter parameters, THEN THE Search_Service SHALL reject the request with a validation error describing the invalid parameters.
15. THE System SHALL display each search result with its data source label and an indicator that the data is unverified sample data.

### Requirement 3: Journal Detail

**User Story:** As a researcher, I want a detailed journal page, so that I can evaluate whether a journal fits my paper.

#### Acceptance Criteria

1. WHEN a user requests a Journal by identifier, THE System SHALL display the Journal name, publisher, ISSN, eISSN, field, scope, indexing, quartile, impact factor, APC, open access status, submission URL, official website, source URL, notes, and last updated timestamp.
2. IF a requested Journal identifier does not exist, THEN THE System SHALL display a not-found message.
3. WHERE a Journal field value is missing or unverified, THE System SHALL display an explicit indicator that the value is missing or unverified for that field.
4. THE System SHALL display a control on the Journal detail page that navigates to the Journal official website using the official URL.

### Requirement 4: Special Issue Detail

**User Story:** As a researcher, I want a detailed special issue page, so that I can assess a call for papers and its deadline.

#### Acceptance Criteria

1. WHEN a user requests a Special_Issue by identifier, THE System SHALL display the title, related Journal, publisher, topic scope, guest editors, submission deadline, publication timeline, submission URL, source URL, status, and last checked timestamp.
2. THE System SHALL display the Special_Issue status as one of open, closed, or upcoming.
3. IF a requested Special_Issue identifier does not exist, THEN THE System SHALL display a not-found message.
4. WHERE a Special_Issue field value is missing or unverified, THE System SHALL display an explicit indicator that the value is missing or unverified for that field.

### Requirement 5: Conference Detail

**User Story:** As a researcher, I want a detailed conference page, so that I can plan a submission against its deadlines and ranking.

#### Acceptance Criteria

1. WHEN a user requests a Conference by identifier, THE System SHALL display the name, acronym, field, organizer, location, mode, submission deadline, notification date, conference date, ranking, indexing, official website, CFP URL, source URL, and status.
2. THE System SHALL display the Conference mode as one of online, offline, or hybrid.
3. THE System SHALL display the Conference ranking as one of CORE A*, A, B, C, or other.
4. IF a requested Conference identifier does not exist, THEN THE System SHALL display a not-found message.
5. WHERE a Conference field value is missing or unverified, THE System SHALL display an explicit indicator that the value is missing or unverified for that field.

### Requirement 6: Abstract Analysis Input

**User Story:** As an author, I want to submit my paper details to the analyzer, so that I can receive venue recommendations.

#### Acceptance Criteria

1. THE Abstract_Analyzer SHALL accept a paper title, an abstract, keywords, a research field, a preferred venue type, a preferred indexing, a preferred deadline range, and an open access preference as inputs.
2. WHEN a user submits the analyzer form, THE System SHALL validate the inputs against a defined schema before sending the request to the AI_Recommendation_Service.
3. IF the abstract input is empty, THEN THE System SHALL reject the submission and display a message indicating the abstract is required.
4. IF the abstract input exceeds the maximum allowed length, THEN THE System SHALL reject the submission and display a message indicating the maximum length.
5. WHERE a user provides a preferred venue type, THE AI_Recommendation_Service SHALL restrict recommendations to the selected venue type.

### Requirement 7: AI Recommendation Generation

**User Story:** As an author, I want the system to analyze my abstract against real database venues, so that I receive grounded recommendations rather than fabricated ones.

#### Acceptance Criteria

1. WHEN the AI_Recommendation_Service receives a valid analysis request, THE AI_Recommendation_Service SHALL produce a main topic, subfield, methodology, contribution type, extracted keywords, and suitable disciplines from the submitted abstract.
2. THE AI_Recommendation_Service SHALL select all recommended Venues from Venues that exist in the database.
3. THE AI_Recommendation_Service SHALL return each recommendation with a Match_Score that is an integer between 0 and 100 inclusive.
4. THE AI_Recommendation_Service SHALL return each recommendation with a recommendation reason, scope alignment, submission deadline, indexing, and submission URL.
5. WHERE a recommended Venue has a missing or unverified field, THE AI_Recommendation_Service SHALL include a warning identifying the missing or unverified field.
6. THE AI_Recommendation_Service SHALL return a suggested abstract improvement and a suggested title improvement for the submitted paper.
7. THE AI_Recommendation_Service SHALL return the analysis result as structured data that conforms to a defined schema.
8. IF the AI_Recommendation_Service output does not conform to the defined schema, THEN THE System SHALL reject the output and return a recommendation error without persisting the result.
9. THE AI_Recommendation_Service SHALL order recommendation items by descending Match_Score.

### Requirement 8: Rule-Based Fallback

**User Story:** As an author, I want recommendations even when no AI key is configured or the AI service fails, so that the platform remains usable.

#### Acceptance Criteria

1. WHERE no AI API key is configured, THE AI_Recommendation_Service SHALL use the Rule_Based_Fallback to generate recommendations.
2. IF the external AI API request fails, THEN THE AI_Recommendation_Service SHALL use the Rule_Based_Fallback to generate recommendations.
3. THE Rule_Based_Fallback SHALL compute Match_Score using keyword overlap, field match, deadline availability, and indexing match between the submitted abstract and database Venues.
4. THE Rule_Based_Fallback SHALL return analysis results in the same schema as the AI-based recommendations.
5. WHEN the Rule_Based_Fallback is used, THE System SHALL display a method indicator that matches the method actually used to produce the recommendations.

### Requirement 9: Recommendation Persistence and Retrieval

**User Story:** As an author, I want my recommendation results saved and retrievable, so that I can revisit them later.

#### Acceptance Criteria

1. WHEN the AI_Recommendation_Service produces a valid Recommendation_Result, THE System SHALL persist the Recommendation_Result and its Recommendation_Items.
2. WHEN a user requests a Recommendation_Result by identifier, THE System SHALL return the persisted analysis and recommendation items.
3. IF a requested Recommendation_Result identifier does not exist, THEN THE System SHALL return a not-found error.
4. WHEN a user chooses to save a Recommendation_Result, THE System SHALL store it as a Saved_Recommendation accessible without user authentication.
5. WHEN a user views Saved_Recommendations, THE System SHALL display the list of saved Recommendation_Results.

### Requirement 10: Data Integrity and Sourcing

**User Story:** As a platform owner, I want all venue data to carry source provenance and never be fabricated, so that users can trust and later verify the data.

#### Acceptance Criteria

1. THE System SHALL store a source URL and an official URL for every Journal, Conference, and Special_Issue record.
2. THE System SHALL associate every Journal, Conference, and Special_Issue record with a Data_Source record.
3. WHERE a venue record originates from sample data, THE System SHALL label the record as unverified Mock_Data.
4. THE System SHALL NOT generate venue records that are not derived from a Data_Source or user import.
5. THE System SHALL store a last checked timestamp for every Journal, Conference, and Special_Issue record.

### Requirement 11: Seed Data

**User Story:** As a developer, I want a seed script that populates clearly labeled sample data, so that I can run and demonstrate the app locally.

#### Acceptance Criteria

1. WHEN the Seed_Script runs, THE System SHALL create at least 10 Journal records, at least 10 Conference records, at least 10 Special_Issue records, and at least 20 Paper records.
2. THE Seed_Script SHALL label every created venue record as unverified Mock_Data.
3. THE Seed_Script SHALL populate a source URL and an official URL for every created venue record.
4. WHEN the Seed_Script runs against a database that already contains seeded records, THE System SHALL avoid creating duplicate records for the same source.

### Requirement 12: Admin Data Management

**User Story:** As an administrator, I want a data management page and seed endpoint, so that I can manage venue data during the MVP.

#### Acceptance Criteria

1. WHEN an administrator opens the admin data management page, THE System SHALL display the lists of Journals, Conferences, and Special_Issues.
2. WHEN an administrator triggers the seed operation through the admin seed endpoint, THE Admin_Service SHALL run the Seed_Script and return the count of created records.
3. THE System SHALL implement the Admin_Service in a code module separated from public functionality to support future authentication.

### Requirement 13: API Endpoints

**User Story:** As a frontend developer, I want documented API endpoints, so that the frontend can retrieve and submit data consistently.

#### Acceptance Criteria

1. THE System SHALL expose a GET search endpoint that returns results across content types based on query parameters.
2. THE System SHALL expose GET endpoints that return lists of Journals, Conferences, and Special_Issues.
3. THE System SHALL expose GET endpoints that return a single Journal, Conference, or Special_Issue by identifier.
4. THE System SHALL expose a POST analyze-abstract endpoint that returns a Recommendation_Result.
5. THE System SHALL expose a GET recommendations endpoint that returns a Recommendation_Result by identifier.
6. THE System SHALL expose a POST admin seed endpoint that triggers the Seed_Script.
7. IF an API request body or query parameters fail schema validation, THEN THE System SHALL respond with a validation error and a status code indicating a client error.

### Requirement 14: Data Ingestion Module

**User Story:** As a developer, I want an ingestion module with clear skeletons, so that real data sources can be added later without redesign.

#### Acceptance Criteria

1. THE Ingestion_Module SHALL provide a CSV import interface that accepts venue records and persists them with a Data_Source reference.
2. THE Ingestion_Module SHALL provide a JSON import interface that accepts venue records and persists them with a Data_Source reference.
3. THE Ingestion_Module SHALL provide a source normalization interface that maps imported fields to the database schema.
4. WHEN the Ingestion_Module imports a record matching an existing record by source URL, THE Ingestion_Module SHALL detect the duplicate and update the existing record rather than creating a new one.
5. WHEN the Ingestion_Module imports or rechecks a record, THE Ingestion_Module SHALL update the last checked timestamp of the record.

### Requirement 15: Input Validation and Error Resilience

**User Story:** As a user, I want the app to validate inputs and stay stable when errors occur, so that I have a reliable experience.

#### Acceptance Criteria

1. THE System SHALL validate all API request inputs against defined schemas before processing.
2. IF the external AI API returns an error or times out, THEN THE System SHALL continue operating using the Rule_Based_Fallback and SHALL NOT terminate the request with an unhandled exception.
3. IF a database query fails, THEN THE System SHALL return an error response and SHALL log the error.
4. THE System SHALL exclude API keys and secrets from client-delivered code and from version-controlled files.
5. THE System SHALL provide an environment example file that documents required environment variables without containing secret values.

### Requirement 16: Local Setup and Documentation

**User Story:** As a developer, I want a runnable local project with clear documentation, so that I can install, configure, migrate, seed, and run the app.

#### Acceptance Criteria

1. THE System SHALL provide a README that documents the install, environment setup, database migration, seed, and run steps.
2. THE README SHALL state that the included venue data is unverified sample mock data.
3. THE System SHALL provide a gitignore file that excludes environment files and build artifacts from version control.
4. WHEN a developer runs the documented setup steps in order, THE System SHALL start the application locally and serve the landing page.
