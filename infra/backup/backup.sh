#!/usr/bin/env bash
# HAWLHAYE — Nightly encrypted database backup
# Works on both Docker (local/dev/staging) and native Postgres (production).

set -euo pipefail

: "${BACKUP_DIR:=/var/backups/hawl}"
: "${BACKUP_RETENTION_DAYS:=30}"
: "${GPG_RECIPIENT:=backup@cecit.edu.so}"
: "${RCLONE_REMOTE:=hawl-backup}"
: "${DB_NAME:=hawl}"
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=5432}"
: "${DB_USER:=hawl}"
: "${PG_CONTAINER:=infra-db-1}"

export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DATE_ONLY="$(date -u +%Y%m%d)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo hawl)"
WORK_DIR="${BACKUP_DIR}/${DATE_ONLY}"

mkdir -p "$WORK_DIR"
chmod 700 "$WORK_DIR" 2>/dev/null || true

DUMP_FILE="${WORK_DIR}/${HOSTNAME_SHORT}-${STAMP}.sql.gz.gpg"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"; }
fail() { log "FATAL: $*" >&2; exit 1; }
trap 'fail "backup failed at line $LINENO"' ERR

# ── Detect environment ────────────────────────────────────
USE_DOCKER=0
if ! command -v pg_dump >/dev/null 2>&1; then
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    USE_DOCKER=1
    log "pg_dump not on host; using docker container: ${PG_CONTAINER}"
  else
    fail "pg_dump not installed and container '${PG_CONTAINER}' not running"
  fi
else
  log "Using local pg_dump"
fi

log "Starting backup of ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# ── 1. Dump ──────────────────────────────────────────────
DUMP_TMP="${WORK_DIR}/.dump.sql.gz"

if [ "$USE_DOCKER" = "1" ]; then
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$PG_CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl --clean --if-exists \
    | gzip -9 > "$DUMP_TMP"
else
  pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
    --no-owner --no-acl --clean --if-exists \
    | gzip -9 > "$DUMP_TMP"
fi

DUMP_SIZE=$(stat -c%s "$DUMP_TMP" 2>/dev/null || stat -f%z "$DUMP_TMP")
if [ "$DUMP_SIZE" -lt 1024 ]; then
  fail "dump is suspiciously small (${DUMP_SIZE} bytes). Aborting."
fi
log "Dump complete: $(numfmt --to=iec "$DUMP_SIZE" 2>/dev/null || echo "${DUMP_SIZE} bytes")"

# ── 2. Checksum ──────────────────────────────────────────
sha256sum "$DUMP_TMP" | awk '{print $1}' > "${DUMP_TMP}.sha256"

# ── 3. Encrypt ───────────────────────────────────────────
log "Encrypting with GPG recipient: ${GPG_RECIPIENT}"
gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" \
  --output "$DUMP_FILE" --encrypt "$DUMP_TMP"

gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" \
  --output "${DUMP_FILE}.sha256" --encrypt "${DUMP_TMP}.sha256"

rm -f "$DUMP_TMP" "${DUMP_TMP}.sha256"

FINAL_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
log "Encrypted backup written: ${DUMP_FILE} ($(numfmt --to=iec "$FINAL_SIZE" 2>/dev/null || echo "${FINAL_SIZE} bytes"))"

# ── 4. Offsite upload ────────────────────────────────────
if command -v rclone >/dev/null 2>&1; then
  log "Uploading to rclone remote: ${RCLONE_REMOTE}"
  rclone copy "$DUMP_FILE" "${RCLONE_REMOTE}:hawl-db/${DATE_ONLY}/" --immutable || log "WARN: rclone upload failed"
  rclone copy "${DUMP_FILE}.sha256" "${RCLONE_REMOTE}:hawl-db/${DATE_ONLY}/" --immutable || true
  log "Offsite upload complete"
else
  log "rclone not installed — skipping offsite upload"
fi

# ── 5. Prune ─────────────────────────────────────────────
log "Pruning local backups older than ${BACKUP_RETENTION_DAYS} days"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d \
  -name "20[0-9][0-9][0-9][0-9][0-9][0-9]" \
  -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true

log "Backup succeeded: $(basename "$DUMP_FILE")"
