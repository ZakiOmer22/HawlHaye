# ADR 0001: Technology stack

Status: Accepted (Day 1). Deciders: Tech Lead with the team.

**Decision:** npm-workspaces monorepo. Frontend Next.js (React, TypeScript, Tailwind). Backend Node.js + Express + TypeScript REST API. PostgreSQL with Prisma. Zod schemas shared between web and API. Docker Compose + Caddy on one VPS.

**Why:** one language across the stack, shared types and rules, widely known by the team, easy for the University to maintain, low cost.

**Consequences:** the API and web build against `@hawl/shared`, so roles, statuses and workflow live in one place. If the team is far more comfortable with another stack, write a new ADR with the reason before switching.

**Not yet decided:** object storage provider for attachments; email provider for reminders (post-launch).
