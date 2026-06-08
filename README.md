# PaperScout AI

PaperScout AI helps researchers discover academic venues and decide where to
submit a paper. Search journals and papers, browse conferences and journal
special issues, then paste your **title + abstract** to get ranked venue
recommendations with match scores, scope alignment, deadlines, warnings, and
suggested improvements.

> **MVP.** Journals and papers come live from the free **OpenAlex** API.
> Conferences and special issues are clearly labelled **sample/mock data**
> (they are not verified against an authoritative source). Nothing in the app
> fabricates verified venue information.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** + **Shadcn UI**
- **React Hook Form** + **Zod** (validation shared client/server)
- **Prisma 7** + **PostgreSQL** (driver adapters). Local dev uses embedded
  **PGlite** so no database install is required.
- **OpenAlex** as the live journal/paper data source (no API key).
- AI recommendation service (OpenAI-compatible, optional) with a deterministic
  **rule-based fallback**.
- **Vitest** + **fast-check** for property-based tests.

## What works today

| Area | Status |
| --- | --- |
| Journal / paper search | Live from OpenAlex (real data) |
| Journal detail | Live from OpenAlex |
| Conferences / special issues | DB sample data (labelled mock) |
| Abstract analyzer + recommendations | Rule-based (no key) or AI (if configured) |
| Saved recommendations | Yes (no auth needed) |
| Admin data manager + seed | Yes (`/admin/data`, no auth — MVP) |
| Data ingestion (CSV/JSON) | Skeleton + working core |

## Quick start (zero-install local DB)

By default the app uses embedded PGlite, so you do **not** need PostgreSQL.

```bash
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:3000. On first start, the embedded database is created
and seeded automatically (sample conferences, special issues, papers). Journals
and papers in search come live from OpenAlex.

The default `.env` uses:

```
DATABASE_URL="pglite://.pglite"
```

## Using a real PostgreSQL database

Set `DATABASE_URL` to a PostgreSQL connection string, then run migrations and
the seed:

```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/paperscout?schema=public"

npx prisma migrate dev
npx prisma db seed
npm run dev
```

The app automatically uses the `pg` driver adapter for `postgresql://` URLs and
PGlite for `pglite://` URLs.

## Configuring AI (optional)

No AI key is required — the analyzer falls back to a deterministic rule-based
matcher. To enable AI, set an OpenAI-compatible endpoint in `.env`:

- **Hosted OpenAI:** `AI_API_KEY=sk-...`, `AI_MODEL=gpt-4o-mini`
- **Self-hosted (Ollama):** `ollama pull llama3.2`, then
  `AI_API_BASE_URL=http://localhost:11434/v1`, `AI_MODEL=llama3.2`
- **LM Studio:** `AI_API_BASE_URL=http://localhost:1234/v1`

The result page shows whether a recommendation was produced by **AI** or the
**rule-based** matcher.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest (incl. property-based tests) |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` (real PostgreSQL) |
| `npm run db:seed` | Seed the database |

## Project structure

```
prisma/                 schema.prisma, schema.sql, seed.ts
prisma.config.ts        Prisma 7 config (loads .env)
src/
  app/                  App Router pages + /api route handlers
  components/           UI + provenance components (badges, notices)
  lib/
    db/                 prisma singleton, pglite embedded DB
    providers/openalex  live OpenAlex journal/paper integration
    schemas/            shared Zod schemas
    services/           search, venue, recommendation, admin
      recommendation/   ai-client, candidates, extract, fallback, prompt
    ingestion/          CSV/JSON import, normalize, dedupe, crawler stub
    http/               typed errors, logger, handleRoute
  instrumentation.ts    PGlite schema + seed on server start
tests/                  fast-check property tests
.kiro/specs/paperscout-ai/  requirements, design, tasks
```

## API endpoints

- `GET /api/search` — search across journals (OpenAlex), papers (OpenAlex),
  conferences and special issues (DB)
- `GET /api/journals`, `GET /api/journals/[id]`
- `GET /api/conferences`, `GET /api/conferences/[id]`
- `GET /api/special-issues`, `GET /api/special-issues/[id]`
- `POST /api/analyze-abstract` — returns a recommendation result
- `GET /api/recommendations/[id]`
- `GET` / `POST /api/saved-recommendations`
- `POST /api/admin/seed` — runs the idempotent seed (MVP: unauthenticated)

## Data integrity

- Journals/papers are attributed to **OpenAlex** (real data).
- Conferences/special issues are **sample/mock** and labelled "Unverified
  sample data" in the UI.
- Every venue record carries a source URL and a data-source reference; the app
  never invents venues, and recommendations only reference venues returned by a
  real query (OpenAlex or DB).

## Roadmap / next steps

- Real conference & CFP data (e.g. an authorized feed) — OpenAlex has no CFPs.
- Journal quartiles/SJR ranks via a Scimago CSV import (no public API).
- Authentication around the admin area and saved recommendations.
- Expand property/integration test coverage to all 23 design properties.

## License

Sample/educational project.
