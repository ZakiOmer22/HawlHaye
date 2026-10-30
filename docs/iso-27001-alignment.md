# HAWL — ISO 27001:2022 Alignment & Security Controls

**Version:** 1.0
**Date:** 23 October 2026
**Owner:** Zacki Omer (Tech Lead)
**Scope:** The HAWL task management application, its supporting infrastructure (VPS, database, backups), and the development/deployment pipeline.

This document is a statement of alignment, not a certificate. It maps our implemented technical and procedural controls to the relevant ISO 27001:2022 Annex A controls for a SaaS platform.

## 1. Asset Inventory (A.8.1.1)

| Asset | Owner | Location | Classification |
| :--- | :--- | :--- | :--- |
| Source Code (Git) | Zacki Omer | GitHub | Confidential |
| Production VPS | Ridwan Maxamed | Cloud Provider | Confidential |
| PostgreSQL Database | Abdiqadir Ibrahim | VPS (Docker Volume) | Confidential |
| Encrypted Offsite Backups | Abdiqadir Ibrahim | Object Storage (S3/R2) | Confidential |
| User Credentials (Hashed) | Zacki Omer | PostgreSQL | Secret |
| Session Tokens (Hashed) | Zacki Omer | PostgreSQL | Secret |

## 2. Control Mapping

### A.5 Organizational Controls
*   **A.5.15 Access Control:** Enforced via RBAC middleware (`requireRole`) and object-level checks (`taskScopeFor`). Documented in `docs/permissions.md`.
*   **A.5.18 Access Rights (Quarterly Review):** Formal process defined in `docs/access-review.md`. Evidence generated via the Admin Users UI and `AuditLog`.
*   **A.5.24 Incident Management:** Procedure documented in `docs/incident-response.md`.
*   **A.5.29 ICT Readiness (DR/BCP):** Nightly encrypted backups with offsite immutability. Restore test procedure in `docs/restore-tests.md`.

### A.6 People Controls
*   **A.6.3 Awareness & Training:** Training material in `docs/training/` (English and Somali). Success check: each trained user completes a real task in their first week.

### A.8 Technological Controls
*   **A.8.2 Privileged Access:** All access is least-privilege. Database roles (`hawl_app`, `hawl_readonly`) have minimal grants.
*   **A.8.5 Secure Authentication:** Argon2id hashing, progressive account lockout, strict session management (`httpOnly`, `SameSite` cookies).
*   **A.8.9 Configuration Management:** Infrastructure-as-Code (Docker Compose, Caddyfile). Secrets managed via `.env` (never committed).
*   **A.8.12 Data Leakage Prevention:** Pino logging redacts passwords and tokens (`[REDACTED]`).
*   **A.8.15 Logging:** Immutable audit trail (`task_events`, `audit_logs`). Enforced by database triggers.
*   **A.8.28 Secure Coding:** Zod schema validation on all inputs. CSRF protection enabled. OWASP Top 10 review part of the definition of done.
