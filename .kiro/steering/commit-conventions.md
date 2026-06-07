---
inclusion: manual
---

# Git Commit Conventions (Enterprise Standard)

This project uses the [Conventional Commits](https://www.conventionalcommits.org/) specification for every commit. Commits are made by the agent; the user handles `git push`.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Subject line**: imperative mood, no trailing period, <= 70 characters.
- **Body** (optional but preferred for non-trivial changes): wrap at ~72 columns, explain *what* and *why*, not *how*. Use bullet points for multiple changes.
- **Footer** (optional): reference spec/requirements, e.g. `Refs: paperscout-ai spec`, or `BREAKING CHANGE:` notes.

## Allowed Types

| Type | Use for |
| --- | --- |
| `feat` | A new feature or user-facing capability |
| `fix` | A bug fix |
| `docs` | Documentation only (README, comments, spec docs) |
| `style` | Formatting, whitespace, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system, dependencies, package manager |
| `ci` | CI configuration and scripts |
| `chore` | Maintenance, scaffolding, tooling, no src/test change |
| `revert` | Reverting a previous commit |

## Scope Convention

Scope is a short noun describing the affected area. Examples for PaperScout AI:

`setup`, `prisma`, `schema`, `seed`, `api`, `search`, `analyzer`, `ai`,
`recommendations`, `admin`, `ingestion`, `ui`, `home`, `journals`,
`conferences`, `special-issues`, `validation`, `docs`, `spec`.

## Milestone Commit Plan

Commits are made per logical milestone, in this order:

1. `chore(setup): initialize PaperScout AI Next.js project`
2. `feat(prisma): add Prisma schema for academic venues`
3. `feat(seed): add labeled sample data for journals, conferences, special issues, and papers`
4. `feat(api): implement search and venue listing/detail endpoints`
5. `feat(ui): add app layout and core pages`
6. `feat(search): build search and filter UI`
7. `feat(analyzer): build abstract analyzer workflow`
8. `feat(ai): add AI recommendation service with rule-based fallback`
9. `feat(recommendations): add recommendation result and saved pages`
10. `feat(admin): add admin data manager and seed endpoint`
11. `test(ai): add property-based and integration tests`
12. `docs: add setup and usage guide`

## Rules

- Stage specific paths, not blanket `git add .`, unless the change is genuinely whole-tree scaffolding (e.g., initial project creation).
- Never commit secrets. Verify `.env` and `.env.local` are git-ignored before committing.
- Flag any file that looks like it contains credentials before staging it.
- Do not amend or force-push. Prefer new commits.
- Do not run `git push`; the user pushes manually.
- Each commit should leave the project in a buildable state where practical.
- Write commit bodies in the imperative, describing the change set and referencing the spec when relevant.

## Example

```
feat(prisma): add Prisma schema for academic venues

Define the data layer for PaperScout AI with full provenance support:

- Add DataSource, Field, Keyword, Journal, Conference, SpecialIssue,
  Paper, RecommendationResult, and RecommendationItem models.
- Embed provenance fields (sourceUrl, officialUrl, dataSourceId,
  status, lastCheckedAt) on every venue to prevent fabricated data.
- Add @@unique([dataSourceId, sourceUrl]) for duplicate detection
  during future imports.

Refs: paperscout-ai spec (Requirement 10, Design: Data Models)
```
