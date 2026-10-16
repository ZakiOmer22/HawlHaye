# API contract v0 (Zacki + Maxamed Siciid, Day 1)

Base path `/api/v1`. JSON. Cookie session. Errors: `{ "error": "code", "message": "..." }`. Validation errors: 400 with `issues`.
Request shapes are the Zod schemas in `packages/shared/src/schemas.ts`. Frontend builds against mocks until endpoints are live.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| POST | /auth/login | public (rate limited) | Sets session cookie |
| POST | /auth/logout | any | Revokes session |
| POST | /auth/accept-invite | invited user | Single-use token, sets password |
| GET | /auth/me | any | Current user, role, office |
| GET/POST | /users | Admin, leadership | Create sends invite |
| PATCH | /users/:id | Admin, leadership | Role, office, active |
| GET/POST/PATCH | /offices | read: any; write: Admin | |
| GET/POST/PATCH | /categories | read: any; write: Admin | |
| GET | /tasks | by role | Filters: status, category, office, owner, priority, overdue, q; paginated |
| POST | /tasks | Dean, Deputy, Admin | Code CECIT-YYYY-NNN generated server-side |
| GET | /tasks/:id | by visibility | Includes history |
| POST | /tasks/:id/assign | Dean, Deputy | Owner, priority, due date |
| POST | /tasks/:id/transition | by workflow rules | Body: `{ to, reason? }` |
| POST | /tasks/:id/delegate | owner | One active delegate |
| GET/POST | /tasks/:id/comments | by visibility | |
| POST | /tasks/:id/attachments | by visibility | 10 MB, allow-listed types |
| GET | /attachments/:id | by visibility | Short-lived signed download |
| GET | /tasks/board | by role | Tasks grouped by status |
| GET | /reports/data/:id | by role | R1-R8; `?format=csv` |
| GET | /reports/system/:id | Dean, Deputy, Admin | S1-S5; `?format=csv` |
| GET | /audit | Dean, Deputy, Admin | Searchable audit trail |
| GET | /health | public | Liveness |
