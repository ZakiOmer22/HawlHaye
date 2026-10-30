#!/usr/bin/env bash
# HAWLHAYE — Restore from an encrypted backup
# Usage: ./restore.sh <backup-file.gpg>
# Example: ./restore.sh /var/backups/hawl/20261029/hawl-20261029T030000Z.sql.gz.gpg

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore.sh <backup-file.gpg>}"
: "${DB_NAME:=hawl}"
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=5432}"
: "${DB_USER:=hawl}"
: "${RESTORE_DB_NAME:=${DB_NAME}_restore_$(date -u +%Y%m%d%H%M%S)}"

export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "FATAL: $*" >&2; exit 1; }

[ -f "$BACKUP_FILE" ] || fail "backup file not found: $BACKUP_FILE"
[ -f "${BACKUP_FILE}.sha256" ] || fail "checksum file not found: ${BACKUP_FILE}.sha256"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ── 1. Decrypt checksum + verify ─────────────────────────
log "Decrypting checksum"
gpg --batch --yes --decrypt --output "${TMP_DIR}/dump.sha256" "${BACKUP_FILE}.sha256"

# ── 2. Decrypt dump ──────────────────────────────────────
log "Decrypting backup"
gpg --batch --yes --decrypt --output "${TMP_DIR}/dump.sql.gz" "$BACKUP_FILE"

# ── 3. Verify integrity ──────────────────────────────────
log "Verifying SHA256"
EXPECTED=$(cat "${TMP_DIR}/dump.sha256")
ACTUAL=$(sha256sum "${TMP_DIR}/dump.sql.gz" | awk '{print $1}')
if [ "$EXPECTED" != "$ACTUAL" ]; then
  fail "checksum mismatch! expected=$EXPECTED actual=$ACTUAL"
fi
log "Checksum OK"

# ── 4. Create a fresh database ───────────────────────────
log "Creating restore database: ${RESTORE_DB_NAME}"
createdb --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" "$RESTORE_DB_NAME" || fail "could not create restore db"

# ── 5. Restore ───────────────────────────────────────────
log "Restoring into ${RESTORE_DB_NAME}"
gunzip -c "${TMP_DIR}/dump.sql.gz" | psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$RESTORE_DB_NAME" \
  --single-transaction --set ON_ERROR_STOP=1 > /dev/null

# ── 6. Verify ────────────────────────────────────────────
log "Verifying restore (counting users + tasks)"
USERS=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$RESTORE_DB_NAME" -tAc 'SELECT COUNT(*) FROM users')
TASKS=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$RESTORE_DB_NAME" -tAc 'SELECT COUNT(*) FROM tasks')
AUDIT=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$RESTORE_DB_NAME" -tAc 'SELECT COUNT(*) FROM audit_logs')

log "Restored: ${USERS} users, ${TASKS} tasks, ${AUDIT} audit entries"

if [ "$USERS" -lt 1 ]; then
  fail "restore produced zero users — something is wrong"
fi

log "✅ Restore complete."
log "To swap this into production:"
log "    ALTER DATABASE ${DB_NAME} RENAME TO ${DB_NAME}_old;"
log "    ALTER DATABASE ${RESTORE_DB_NAME} RENAME TO ${DB_NAME};"
