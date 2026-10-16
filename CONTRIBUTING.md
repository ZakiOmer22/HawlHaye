# Contributing to HAWL

Short rules so six people can merge daily without chaos.

## Branches
- `main` = production. `develop` = integration (auto-deploys to staging).
- Work in `feature/HAWL-<id>-short-name` (stories) or `fix/HAWL-<id>-short-name` (bugs), branched from `develop`.
- Direct pushes to `main` and `develop` are blocked.

## Commits
Format: `type(scope): short message`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
Example: `feat(tasks): require owner and due date on assign`

## Pull requests
- Small and focused (aim for under 400 changed lines). Link the story (`HAWL-05`).
- Fill in the PR template, including how you tested and the permission impact.
- **One reviewer is required. Nobody merges their own PR.** Reviewers respond within two hours during build days.
- CI must pass: lint, typecheck, tests, build, dependency audit.
- Squash-merge to `develop`. Delete the branch after merging.
- Zacki reviews anything touching auth, permissions, workflow, uploads, or infra.

## Code rules
- TypeScript strict. No `any` without a comment explaining why.
- Validate every request body with a Zod schema from `@hawl/shared`. Reject unknown fields.
- Every endpoint: authenticate, check role, then check object-level access (own task / own office). Deny by default.
- Database access only through Prisma (parameterised). No SQL built from strings.
- Roles, statuses, and workflow rules come from `@hawl/shared`. Never re-define them in web or api.
- Never log passwords, tokens, or full request bodies. Never return stack traces to clients.
- UI: design for a 360 px phone first. Every screen needs loading, empty, and error states.

## Secrets and data
- Never commit `.env`, keys, dumps, or real College data. Use `.env.example` for names only.
- Demo data only in dev and staging. Real data only in production after the go-live checklist.
- If you commit a secret by mistake: tell Zacki immediately and rotate it. Deleting the commit is not enough.

## Tests
- Add or update tests with every change to workflow, permissions, or validation.
- Permission changes need a test for allowed AND forbidden roles.

## Daily rhythm
Stand-up at the agreed time, merge small PRs every day before the evening cut-off, QA tests the evening build on staging, blockers go in the team chat the same day.
