-- Dean's change requests (Nov 2026): reporting lines, coordinator<->administrator links, daily coordinator reports.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "supervisorId" TEXT;

-- CreateTable
CREATE TABLE "administrator_assignments" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "administratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");
CREATE UNIQUE INDEX "administrator_assignments_coordinatorId_administratorId_key" ON "administrator_assignments"("coordinatorId", "administratorId");
CREATE INDEX "administrator_assignments_administratorId_idx" ON "administrator_assignments"("administratorId");
CREATE UNIQUE INDEX "daily_reports_authorId_reportDate_key" ON "daily_reports"("authorId", "reportDate");
CREATE INDEX "daily_reports_reportDate_idx" ON "daily_reports"("reportDate");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrator_assignments" ADD CONSTRAINT "administrator_assignments_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "administrator_assignments" ADD CONSTRAINT "administrator_assignments_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The API connects as a restricted role in production (see prisma/sql/*). Grant it the new tables
-- only if those roles exist, so this migration also runs cleanly on a dev database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hawl_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "administrator_assignments", "daily_reports" TO hawl_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hawl_readonly') THEN
    GRANT SELECT ON "administrator_assignments", "daily_reports" TO hawl_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hawl_backup') THEN
    GRANT SELECT ON "administrator_assignments", "daily_reports" TO hawl_backup;
  END IF;
END $$;
