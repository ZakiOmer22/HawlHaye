-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "hash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "prevHash" TEXT;
