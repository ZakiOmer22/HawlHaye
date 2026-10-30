# HAWL — Access Review Procedure (ISO 27001 A.5.18)

**Frequency:** Quarterly, or immediately after a staff change (joiner/mover/leaver).

## Steps
1. **Export:** The Administrator or Dean navigates to `/admin/users` and exports the active user list.
2. **Review:** For each user, verify their `role` and `officeId` are still correct for their current responsibilities.
3. **Identify Leavers:** Any user who has left the College must be immediately deactivated (`active=false`) and their sessions revoked.
4. **Document:** The reviewer signs and dates a copy of the user list. Store this evidence in a secure location (e.g., a restricted cloud drive). The `AuditLog` automatically records all user deactivations and role changes as immutable evidence.
5. **Confirmation:** A second reviewer (e.g., the Dean) spot-checks the list and countersigns.
