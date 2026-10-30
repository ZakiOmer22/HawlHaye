# HAWL — Risk Assessment & Treatment Plan

**Version:** 1.0 | **Owner:** Zacki Omer | **Review Cadence:** Quarterly

| Risk | Likelihood | Impact | Score (L x I) | Mitigation | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Brute-force attack on user accounts** | High | High | **Critical** | Progressive account lockout (5m → 15m → 60m → 24h). Login rate limiting per IP. Strict error messaging to prevent enumeration. | `auth/routes.ts`, `AuditLog` |
| **Unauthorized access to sensitive data** | Medium | High | **High** | RBAC on every endpoint. Object-level checks. Least-privilege DB roles (`hawl_app`). | `middleware/rbac.ts`, `service.ts` |
| **History or audit trail tampering** | Low | High | **Medium** | Database-level `REVOKE UPDATE, DELETE` on `task_events` and `audit_logs`. Append-only triggers. | `schema.prisma`, custom SQL migration |
| **Data loss due to ransomware** | Low | Critical | **High** | Nightly encrypted backups. Offsite copy with **immutable storage** (S3 Object Lock). | `infra/backup/backup.sh` |
| **DDoS / L7 flood** | Medium | Medium | **Medium** | Cloudflare proxy (free tier) absorbs volumetric attacks. Caddy rate-limiting. | `Caddyfile`, `app.ts` |
| **Malicious file upload** | Low | Medium | **Low** | Allow-list of MIME types. 10MB limit. Randomised storage names. Private storage. | `tasks/routes.ts` |
| **SQL Injection** | Very Low | High | **Low** | Prisma parameterised queries. No raw string concatenation. | `lib/prisma.ts` |
| **Secret leakage in logs** | Low | High | **Medium** | Pino redaction for `password`, `token`, `cookie` headers. | `lib/logger.ts` |

**Review Action:** Re-assess after any major feature change or security incident.
