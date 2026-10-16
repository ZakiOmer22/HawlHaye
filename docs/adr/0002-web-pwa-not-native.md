# ADR 0002: Mobile-friendly web (PWA), no React Native for v1

Status: Accepted (Day 1).

**Decision:** build one responsive web app, installable as a PWA. No native app in v1.

**Why:** two-week delivery; one codebase and deployment; no app-store accounts or release steps; internal users reach it by link. React Native would roughly double frontend work.

**Consequences:** design phone-first (360 px), use tap-based "Move to" on phones, add a manifest and icons. The API stays client-agnostic so a native app remains possible later.
