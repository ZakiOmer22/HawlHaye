# HAWL

**CECIT College Task Management System** (University of Hargeisa). Assign. Track. Review.

A secure, mobile-friendly Kanban system with multiple categories, a six-stage workflow with leadership approval, and reports on both the work and the system itself.

> Status: Day 1 scaffold. Rights reserved until the final questions from last day is completed.

## Quick start

Requirements: Node 20+, npm 10+, Docker (for the local database).

```bash
git clone <repo-url> hawl && cd hawl
cp .env.example .env              # then edit values; never commit .env
npm ci
docker compose -f infra/docker-compose.dev.yml up -d   # local PostgreSQL
npm run dev:api                   # http://localhost:4000/health
npm run dev:web                   # http://localhost:3000
```

Before pushing: `npm run lint && npm run typecheck && npm test && npm run format:check`

## Structure

```
hawl/
  apps/
    web/            Next.js (React, TypeScript, Tailwind) - mobile-first PWA
    api/            Express API (TypeScript) - modules under src/modules/
      prisma/       Database schema DRAFT (Abdiqadir owns)
  packages/
    shared/         Roles, statuses, workflow rules, Zod schemas, task codes (used by web AND api)
  infra/            Docker Compose, Caddy, Dockerfiles, backup scripts, runbooks
  docs/             ADRs, API contract, permissions, workflow, security checklist, team ownership
  .github/          CI, PR template, issue templates, CODEOWNERS, Dependabot
```

## Key rules (details in CONTRIBUTING.md)

- Branch from `develop`: `feature/HAWL-05-assign-task`. Small PRs, one reviewer, never merge your own PR.
- Permissions and workflow are enforced on the **server**. The UI only mirrors `@hawl/shared`.
- No secrets in the repo. `.env` stays local. Report leaks immediately (see SECURITY.md).
- A story is Done only when it meets `docs/definition-of-done.md`.

## Docs

| Doc | What |
| --- | --- |
| `docs/team-ownership.md` | Who owns which module and folder |
| `docs/api-contract.md` | Endpoint list (frontend and backend agree here on Day 1) |
| `docs/permissions.md` | Role permission matrix (draft, to validate with users) |
| `docs/workflow.md` | Status transitions and rules |
| `docs/security-checklist.md` | The security controls and who owns each |
| `docs/definition-of-done.md` | When work counts as finished |
| `docs/github-setup.md` | Repository settings to switch on (branch protection, labels) |
| `docs/adr/` | Architecture decision records |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:api` / `dev:web` | Start API / web in watch mode |
| `npm run build` | Build shared, api, web |
| `npm run lint` | ESLint across the repo |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit and API tests (Vitest) |
| `npm run format` | Prettier |
