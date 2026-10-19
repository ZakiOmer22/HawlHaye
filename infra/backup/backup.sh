#!/usr/bin/env sh
# Nightly encrypted database backup. Owners: Abdiqadir (script) + Ridwan (scheduling, offsite).
# Needs: pg_dump, gzip, gpg, rclone. Run from cron on the server. See infra/runbooks/restore.md.
set -eu
: "${DATABASE_URL:?}" "${BACKUP_PASSPHRASE_FILE:?}" "${BACKUP_REMOTE:?}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/tmp/hawl-${STAMP}.sql.gz.gpg"
pg_dump "$DATABASE_URL" | gzip | gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase-file "$BACKUP_PASSPHRASE_FILE" -o "$OUT"
rclone copy "$OUT" "$BACKUP_REMOTE/daily/"
rm -f "$OUT"
echo "backup ok: $STAMP"
