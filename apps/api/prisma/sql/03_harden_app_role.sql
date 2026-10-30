-- 03_harden_app_role.sql
-- Run as owner after 01_roles.sql and 02_grants.sql.
-- Tightens the application role and prevents any schema-level modification.

-- The application must never modify the schema, ever.
REVOKE CREATE ON SCHEMA public FROM hawl_app;

-- Prevent TRUNCATE on any table (belt-and-braces; no explicit TRUNCATE grant exists)
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM hawl_app;

-- The application has no business inspecting Prisma's migration history.
REVOKE ALL ON _prisma_migrations FROM hawl_app;
REVOKE ALL ON _prisma_migrations FROM hawl_readonly;
REVOKE ALL ON _prisma_migrations FROM hawl_backup;
-- hawl_backup actually needs to read the table structure for pg_dump:
GRANT SELECT ON _prisma_migrations TO hawl_backup;

-- Append-only enforcement at the grant level, in addition to the trigger.
REVOKE UPDATE, DELETE, TRUNCATE ON task_events FROM hawl_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM hawl_app;
GRANT SELECT, INSERT ON task_events TO hawl_app;
GRANT SELECT, INSERT ON audit_logs TO hawl_app;
