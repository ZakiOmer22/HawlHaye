<div align="center">
  <h1>⚡ HAWL (HAWLHAYE)</h1>
  <p><strong>CECIT College Task Management System · University of Hargeisa</strong></p>
  <p><em>Assign. Track. Review. Achieve.</em></p>

  [![CI](https://github.com/ZakiOmer22/HawlHaye/actions/workflows/ci.yml/badge.svg)](https://github.com/ZakiOmer22/HawlHaye/actions/workflows/ci.yml)
  [![Security Scan](https://github.com/ZakiOmer22/HawlHaye/actions/workflows/weekly-security.yml/badge.svg)](https://github.com/ZakiOmer22/HawlHaye/actions/workflows/weekly-security.yml)
  [![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://cecit.edu.so)
  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)
</div>

---

## Overview

**HAWL** is a secure, mobile-first Kanban system built specifically for the University of Hargeisa (CECIT). It digitizes the college's workflows by providing a six-stage lifecycle for tasks, multi-level leadership approval, and enterprise-grade auditability.

Whether it's a Dean assigning a task to a coordinator or a Lab Technician updating their progress, HAWL ensures total visibility and accountability.

> **Status**: Production Ready (v3.0) · Phase 5 Enterprise Hardening Complete.

---

## Core Features

| Feature Area | Capabilities |
| :--- | :--- |
| **Kanban Board** | 6 strict workflow stages (Unassigned → Assigned → In Progress → Blocked → Review → Completed) with drag-and-drop (desktop) and tap-to-move (mobile). |
| **Role-Based Access** | 6 specific roles (Dean, Deputy, Faculty, Labs, Admin, Technician). Enforced entirely on the server. |
| **Approval Flow** | Tasks submitted to `Review` can only be accepted or returned by the Dean or Deputy. |
| **Real-time Notifications** | Server-Sent Events (SSE) push instant updates without refreshing. |
| **Email Alerts** | Nodemailer integration for task assignments, delegations, security locks, and 2FA changes. |
| **Enterprise Security** | 2FA enforcement for leadership, Passkeys, encrypted backup codes, hash-chained audit logs, and strict CSP headers. |
| **Offline PWA** | Fully installable on iOS/Android. Shows a custom red offline banner when the network drops. |
| **Reports** | Exportable CSV & PDF reports on task workload, overdue metrics, office stats, and system security events. |
| **Sentry Integration** | Frontend and backend error tracking with custom tunnel routes to bypass ad-blockers. |

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (via Prisma ORM).
- **Security**: Argon2id, Zod, Helmet, CSRF, Rate Limiting, Sentry.
- **Infrastructure**: Vercel (Web), Render (API), Neon (DB), Docker, GitHub Actions.

---

## Monorepo Structure

```text
hawl/
├── apps/
│   ├── web/          # Next.js frontend (Mobile-first PWA)
│   └── api/          # Express backend & Prisma schema
├── packages/
│   └── shared/       # Shared Zod schemas, types, and workflow rules
├── infra/            # Docker, Caddy, backup scripts
└── docs/             # Architecture decisions, runbooks, security policies
```

---

## Local Installation & Setup

### Prerequisites
- Node.js `20+`
- Docker Desktop (for local PostgreSQL)
- npm `10+`

### 1. Clone & Install
```bash
git clone https://github.com/ZakiOmer22/HawlHaye.git
cd HawlHaye
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
```
Open `.env` and configure:
- `DATABASE_URL` (Local Docker Postgres)
- `SESSION_SECRET`, `CSRF_SECRET`, `AUDIT_CHAIN_SECRET` (32+ chars)
- `SENTRY_DSN_API` & `NEXT_PUBLIC_SENTRY_DSN` (Optional for local)

### 3. Start the Database
```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

### 4. Run Migrations & Seed
```bash
npm exec -w @hawl/api prisma migrate dev
npm exec -w @hawl/api prisma db seed
```

### 5. Launch
Open **two terminals**:
```bash
# Terminal 1: Backend API (http://localhost:4000)
npm run dev:api

# Terminal 2: Frontend Web (http://localhost:3000)
npm run dev:web
```

---

## Enterprise Security Architecture

HAWL is built with a "zero-trust" server-side architecture.

- **Authentication**: Passkeys (WebAuthn) + Passwords (Argon2id) + TOTP 2FA.
- **Authorization**: Strict RBAC and object-level ownership checks. Deny by default.
- **Data Integrity**: Audit logs use a cryptographic hash chain. If a record is tampered with in the database, the `/audit/verify` endpoint will detect it.
- **Network**: Strict Content Security Policy (CSP), HSTS, and CORS.
- **Backups**: PGP-encrypted nightly dumps verified via automated restore scripts.

---

## CI/CD & Deployment

- **GitHub Actions**: Runs linting, type-checking, 19 unit tests, format checks, and a Trivy security scan on every push.
- **Vercel**: Deploys the Next.js frontend.
- **Render**: Deploys the Express API backend.
- **Neon**: Serverless PostgreSQL database.

*(See `docs/deployment.md` for the full cloud setup guide).*

---

## Scripts Cheat Sheet

| Command | Action |
| :--- | :--- |
| `npm run dev:api` | Start backend on port 4000 |
| `npm run dev:web` | Start frontend on port 3000 |
| `npm run build` | Build all workspaces for production |
| `npm run lint` | Run ESLint across the repo |
| `npm run typecheck` | Run TypeScript compiler checks |
| `npm test` | Run Vitest test suites |
| `npm run format` | Format code with Prettier |

---

## Documentation Directory

Deep-dive into the system architecture:
- 📄 [API Contract](docs/api-contract.md)
- 🔐 [Permissions Matrix](docs/permissions.md)
- ⚙️ [Workflow Rules](docs/workflow.md)
- 🛡 [Security Checklist](docs/security-checklist.md)
- 🚑 [Incident Response](docs/incident-response.md)

---

<div align="center">
  <p>Built with ❤️ by the HAWL Team at the University of Hargeisa.</p>
  <p><strong>Zacki Omer · Maxamed Omer · Abdiqadir Ibrahim · Maxamed Siciid · Abdimajid Ali · Ridwan Maxamed</strong></p>
</div>
