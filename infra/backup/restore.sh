#!/usr/bin/env sh
# Restore an encrypted backup into an EMPTY database. Usage: restore.sh <file.sql.gz.gpg>
# Always test on staging first. Record every restore test in docs/restore-tests.md.
set -eu
: "${DATABASE_URL:?}" "${BACKUP_PASSPHRASE_FILE:?}"
FILE="${1:?usage: restore.sh <backup-file>}"
gpg --batch --decrypt --passphrase-file "$BACKUP_PASSPHRASE_FILE" "$FILE" | gunzip | psql "$DATABASE_URL"
echo "restore finished"
