# Team ownership

Every module has one owner and one reviewer. Replace `@handle` with real GitHub handles.

| Person | Role | Owns | Reviews |
| --- | --- | --- | --- |
| Zacki Omer | Tech Lead, Backend, Security | `apps/api/src/middleware`, `modules/auth`, `modules/audit`, task workflow, `packages/shared` | Everything touching auth, permissions, uploads, infra |
| Maxamed Siciid | Backend | `modules/users`, `offices`, `categories`, `tasks`, `comments`, `attachments`, `reports` | Frontend API usage |
| Abdiqadir Ibrahim | Database | `apps/api/prisma`, seed, backups, export | Query and index changes |
| Maxamed Omer | Frontend Lead | `apps/web/app` board, task screens, layout, mobile, filters | Admin and reports UI |
| Abdimajid Ali | Frontend, Reports, Admin | admin screens, dashboard, reports UI, help, training material | Board UI |
| Ridwan Maxamed | DevOps, QA | `infra/`, `.github/workflows`, test plan, staging, production | CI and deployment changes |
