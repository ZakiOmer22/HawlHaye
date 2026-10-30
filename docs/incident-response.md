# HAWL — Incident Response Plan

**Objective:** To contain and recover from a security incident while preserving evidence and communicating effectively.

## 1. Detection
- Alerts from the `AuditLog` (e.g., `auth.login_locked` for multiple accounts).
- Unusual patterns in Pino logs (e.g., a spike in `401` or `429` responses).
- User reports of suspicious activity.

## 2. Triage & Severity (First 30 Minutes)
- **Critical:** Unauthorized access to the database, evidence of data exfiltration.
- **High:** One or more privileged accounts compromised.
- **Medium:** Repeated brute-force attempts against a single account.
- **Low:** Isolated failed login attempts.

## 3. Containment
- **If an account is compromised:** Immediately deactivate the user via `POST /api/v1/users/:id/deactivate`. This revokes all sessions. Force a password reset via the invite flow.
- **If the server is compromised:** Snapshot the VPS for forensics, then isolate the API and DB containers from the network. Do not destroy the evidence.

## 4. Eradication & Recovery
- Identify the root cause from the `AuditLog` and server logs.
- Patch the vulnerability, then restore from the last known-good backup using `infra/backup/restore.sh`.
- Verify the restored system with the acceptance tests in `prisma/sql/tests/security_tests.sql`.

## 5. Post-Incident Review
- Document the timeline, impact, root cause, and lessons learned.
- Update the risk register (`docs/risk-assessment.md`) and, if necessary, the security controls.
