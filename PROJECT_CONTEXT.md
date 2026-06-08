# PaperScout AI — Project Context

> Tài liệu tổng hợp toàn bộ ngữ cảnh dự án để tiếp tục làm việc. Cập nhật: milestone 1–9 đã xong.

## 1. Sản phẩm

**PaperScout AI** — nền tảng MVP giúp nhà nghiên cứu:
- Tìm kiếm papers, journals, special issues, conferences với bộ lọc phong phú.
- Dán **title + abstract** → hệ thống phân tích và đề xuất venue phù hợp (journal/conference/special issue) kèm: match score 0–100, lý do, scope alignment, deadline, indexing, submission URL, cảnh báo dữ liệu thiếu/chưa xác minh, và gợi ý cải thiện title/abstract.

**Nguyên tắc cốt lõi (bất biến):** KHÔNG bịa dữ liệu venue. Mọi venue đều gắn `DataSource` + `sourceUrl` + `officialUrl`, dữ liệu mẫu được gắn nhãn `UNVERIFIED_MOCK` (chưa xác minh).

## 2. Tech stack

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16.2.7 (App Router, Turbopack), TypeScript, Tailwind v4, Shadcn UI |
| Form/validation | React Hook Form + Zod (schema dùng chung client/server) |
| Backend | Next.js Route Handlers + service layer (`src/lib/services`) |
| ORM/DB | Prisma 7.8 + PostgreSQL (driver adapter `@prisma/adapter-pg`) |
| AI | Client OpenAI-compatible + rule-based fallback xác định |

> **Lưu ý quan trọng về phiên bản:** Next.js 16 và Prisma 7 mới hơn dữ liệu huấn luyện mặc định. Quy ước phải đọc docs trong `node_modules/next/dist/docs/` trước khi viết code Next.js (theo `AGENTS.md`). Điểm khác biệt đã gặp: `params`/`searchParams` là **Promise** (phải `await`); Prisma 7 bỏ `url` khỏi `schema.prisma` (chuyển sang `prisma.config.ts`) và bắt buộc **driver adapter** cho `new PrismaClient()`.

## 3. Trạng thái — đã hoàn thành (milestone 1–9)

| # | Commit | Nội dung |
|---|---|---|
| spec | `docs(spec)` ×3 | requirements (16 EARS), design (23 correctness property), tasks, skill commit |
| 1 | `chore(setup)` | scaffold Next.js + TS + Tailwind + Shadcn, `.gitignore`, `.env.example` |
| 2 | `feat(prisma)` | schema 9 model + provenance + `@@unique([dataSourceId, sourceUrl])` |
| 3 | `feat(seed)` | 11 journals, 11 conferences, 11 special issues, 21 papers (UNVERIFIED_MOCK, idempotent) |
| – | `fix(prisma)` | driver adapter pg + auto-load `.env` |
| 4 | `feat(api)` | Zod schemas, DTO+mappers, error handling/logger/handleRoute, search service, read API |
| 5 | `feat(ui)` | layout + nav, landing, list/detail pages, components provenance |
| 6 | `feat(search)` | trang `/search` filter sidebar + states |
| – | `feat(ui)` | theme dịu mắt + dark mode, list/search chịu lỗi DB, AI client OpenAI-compatible |
| 7–9 | `feat(analyzer)` | `/analyze` form, recommendation service (AI + rule-based fallback), `/recommendations/[id]`, `/saved` |

Mỗi bước đều pass `tsc --noEmit`. Dev server đã chạy: `http://localhost:3000`.

## 4. Cấu trúc thư mục chính

```
prisma/
  schema.prisma          # 9 model + enums + provenance
  seed.ts                # seed idempotent (UNVERIFIED_MOCK)
prisma.config.ts         # Prisma 7 config (url + seed + auto-load .env)
src/
  app/
    page.tsx             # landing
    search/page.tsx      # search UI (client)
    journals|conferences|special-issues/(page + [id]/page)
    analyze/page.tsx     # analyzer form (client)
    recommendations/[id]/(page + save-button)
    saved/page.tsx
    api/
      search/route.ts
      journals|conferences|special-issues/(route + [id]/route)
      analyze-abstract/route.ts
      recommendations/[id]/route.ts
      saved-recommendations/route.ts
  components/             # site-nav, mock-data-notice, data-source-badge, field-value, ui/*
  lib/
    db/prisma.ts         # singleton + pg adapter
    schemas/index.ts     # Zod (single source of truth)
    dto.ts               # DTO types
    http/                # errors, logger, handle-route
    services/
      search-service.ts
      venue-service.ts
      mappers.ts
      recommendation-service.ts          # orchestrator
      recommendation/
        ai-client.ts     # OpenAI-compatible
        candidates.ts    # query candidate venues
        extract.ts       # phân tích xác định (tokenize/field lexicon)
        fallback.ts      # rule-based scoring
        prompt.ts        # prompt template
.kiro/specs/paperscout-ai/  # requirements.md, design.md, tasks.md, .config.kiro
.kiro/steering/commit-conventions.md     # skill commit chuẩn enterprise
```

## 5. AI recommendation — cách hoạt động

1. Validate input (`AnalyzeRequestSchema`).
2. `queryCandidates()` lấy venue từ DB (lọc theo preferred venue type). **Chỉ** venue trong DB mới được đề xuất (grounding).
3. Nếu có AI key **hoặc** base URL tùy chỉnh → gọi AI (timeout `AbortSignal`), parse JSON, validate `AnalysisResultSchema`, loại bỏ item không khớp candidate id thật.
4. Nếu AI không cấu hình/lỗi/timeout/invalid → **rule-based fallback** (xác định): score = 0.45·keywordOverlap + 0.25·fieldMatch + 0.15·deadlineAvail + 0.15·indexingMatch → int 0–100.
5. Sắp xếp giảm dần theo score, sinh cảnh báo field thiếu/chưa xác minh, lưu DB, trả kết quả.

### Self-host model nhỏ (Ollama)
```
ollama pull llama3.2
# .env:
AI_API_KEY=""
AI_API_BASE_URL="http://localhost:11434/v1"
AI_MODEL="llama3.2"
```
Hoặc LM Studio: `AI_API_BASE_URL="http://localhost:1234/v1"`. Không cấu hình gì → dùng rule-based.

## 6. Cách chạy local

```bash
npm install
copy .env.example .env        # rồi điền DATABASE_URL (PostgreSQL)
npx prisma generate
npx prisma migrate dev        # cần PostgreSQL đang chạy
npx prisma db seed
npm run dev                   # http://localhost:3000
```

> **Môi trường hiện tại chưa có PostgreSQL** (không Docker/psql, port 5432 đóng). App đã được làm **chịu lỗi DB**: các trang list/search vẫn render (empty state) khi chưa có DB, nên xem được giao diện ngay. Để có dữ liệu mẫu thật cần dựng PostgreSQL rồi `migrate` + `seed`.

## 7. Còn lại (milestone 10–13)

| # | Nội dung |
|---|---|
| 10 | Admin data manager (`/admin/data`) + `POST /api/admin/seed` (module tách riêng cho auth sau này) |
| 11 | Module ingestion (`src/lib/ingestion`): import CSV/JSON, normalize, dedupe theo sourceUrl, last-checked, stub crawler |
| 12 | Test: property-based (fast-check, 23 property) + integration + smoke |
| 13 | README + dọn dẹp cuối |

### Việc cần người dùng cung cấp / quyết định
- **PostgreSQL local** (cài Postgres, hoặc Docker) để chạy `migrate`/`seed` và xem dữ liệu thật. Hoặc đồng ý dùng PGlite (Postgres nhúng) — cần xác nhận vì adapter Prisma 7 cho PGlite chưa chắc tương thích.
- (Tùy chọn) Cài Ollama nếu muốn dùng AI thật; không thì rule-based đã đủ chạy.

## 8. Quy ước commit
Theo Conventional Commits (xem `.kiro/steering/commit-conventions.md`). Agent commit theo từng milestone; **người dùng tự `git push`**. Không commit secret (`.env` đã gitignore).
