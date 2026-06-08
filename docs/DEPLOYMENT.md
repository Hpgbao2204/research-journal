# Running & Deploying PaperScout AI

PaperScout AI is designed to run the same code locally and online. Two things
are configurable, independently, through environment variables:

- **Database** — embedded PGlite (zero install) **or** real PostgreSQL.
- **AI** — none (rule-based), a local model (Ollama / LM Studio), or a hosted
  OpenAI-compatible API.

Nothing else changes between environments. You never edit code to switch.

---

## 1. Configuration matrix

| | Database | AI | Best for |
| --- | --- | --- | --- |
| **Local, simplest** | PGlite (`pglite://.pglite`) | none | Trying it out, offline |
| **Local + AI** | PGlite | Ollama (`llama3.2`) | Full features on your machine |
| **Online** | PostgreSQL (Neon) | none or hosted API | Public, multi-visitor |

The app auto-detects the mode from the variable values:

- `DATABASE_URL` starting with `pglite://` → embedded PGlite (schema + seed are
  created automatically on first server start).
- `DATABASE_URL` starting with `postgresql://` → real PostgreSQL (node-postgres
  driver adapter). You create the schema yourself once (`npm run db:push`).
- AI is enabled when **either** `AI_API_KEY` **or** a non-default
  `AI_API_BASE_URL` is set. Otherwise the analyzer uses the deterministic
  rule-based matcher. There is no failure when AI is absent — results just say
  `RULE_BASED` instead of `AI`.

> Journals, papers and quartiles come from local CSVs (Scimago, Web of Science)
> and the live OpenAlex API — **not** the database. The database only stores
> recommendation history and the sample conferences/special issues. So a fresh
> online database still shows a full journal catalogue immediately.

---

## 2. Run locally (zero install)

Requires Node.js 20.6+.

```bash
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:3000. The default `.env` uses
`DATABASE_URL="pglite://.pglite"`, so no PostgreSQL is needed; the embedded
database is created and seeded on first start.

### Add AI locally with Ollama (optional, free, no key)

```bash
# 1. Install Ollama:  https://ollama.com
ollama pull llama3.2            # chat model (analysis + summaries)
ollama pull nomic-embed-text   # embeddings (semantic re-ranking)
```

Then in `.env`:

```dotenv
AI_API_KEY=""
AI_API_BASE_URL="http://localhost:11434/v1"
AI_MODEL="llama3.2"
AI_EMBED_MODEL="nomic-embed-text"
AI_TIMEOUT_MS="120000"
AI_EMBED_TIMEOUT_MS="60000"
```

Restart `npm run dev`. The recommendation page now shows the **AI-generated**
badge and AI paper summaries (the "TL;DR" button) become available. The first
call to a cold local model can take ~30s; subsequent calls are fast.

> Windows note: this project is developed on PowerShell. Use `npm.cmd` /
> `npx.cmd` if `npm` / `npx` are blocked by the execution policy. Chain commands
> with `;` (PowerShell does not support `&&`).

---

## 3. Deploy online (Neon PostgreSQL + Vercel)

### 3.1 Create a PostgreSQL database (Neon, free tier)

1. Create a project at https://neon.tech and copy the connection string. It
   looks like:
   `postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
2. Locally, point `.env` at it temporarily and create the schema:

   ```bash
   # .env
   DATABASE_URL="postgresql://...?sslmode=require"

   npm run db:push      # creates all tables from prisma/schema.prisma
   npm run db:seed      # optional sample conferences / special issues / papers
   ```

   `db:push` syncs the schema without migration files — ideal for a first
   deploy. (Use `npm run db:migrate` later if you want versioned migrations.)

### 3.2 Deploy to Vercel

1. Push the repository to GitHub and import it at https://vercel.com.
2. Set **Environment Variables** in the Vercel project settings:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon `postgresql://...?sslmode=require` string |
   | `OPENALEX_MAILTO` | your email (uses OpenAlex's faster polite pool) |
   | `AI_API_KEY` | *(optional)* hosted OpenAI-compatible key |
   | `AI_API_BASE_URL` | *(optional)* e.g. `https://api.openai.com/v1` |
   | `AI_MODEL` | *(optional)* e.g. `gpt-4o-mini` |
   | `AI_EMBED_MODEL` | *(optional)* e.g. `text-embedding-3-small` |

   Leave the AI variables unset to deploy without AI (rule-based). A local
   Ollama on your machine is **not** reachable from Vercel — for online AI you
   need a hosted API.

3. Deploy. `prisma generate` runs automatically via the `postinstall` script.
   The `data/*.csv` files are part of the repo and ship with the build, so the
   journal catalogue works in production.

> The embedded PGlite database is never used in production: instrumentation
> only initializes it when `DATABASE_URL` starts with `pglite://`, so it is a
> no-op on Vercel.

---

## 4. Switching back and forth

To go from online back to local, just change `DATABASE_URL` in `.env` to
`pglite://.pglite` and (optionally) clear the AI variables. No code changes, no
rebuild config. The same applies in reverse.

---

## 5. Verify before deploying

```bash
npm run typecheck     # tsc --noEmit
npm test              # vitest (property-based tests)
npm run build         # production build (stop the dev server first on Windows
                      # to release the PGlite file lock)
```

---

## 6. Known limitations (current state)

- **No authentication.** "Saved recommendations" are shared across all visitors
  of a deployment; the personal "Library" is stored in the browser's
  localStorage (per device). Add auth before exposing to many real users.
- **Conferences / special issues** are labelled sample data, not a verified
  feed.
- **Online AI requires a hosted endpoint.** A local Ollama only powers the AI
  features when you run the app on the same machine.
