#!/usr/bin/env bash
# HAWLHAYE — Post-restore verification
# Usage: ./verify.sh [<database-name>]

set -euo pipefail
DB_NAME="${1:-hawl}"
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=5432}"
: "${DB_USER:=hawl}"
export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"

q() {
  psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" -tAc "$1"
}

echo "Verifying database: ${DB_NAME}"
echo "─────────────────────────────────────────"

CHECKS=0
FAILED=0

check() {
  local label="$1"
  local query="$2"
  local min_expected="${3:-1}"
  CHECKS=$((CHECKS + 1))
  local result
  result=$(q "$query" 2>/dev/null || echo "ERR")
  if [ "$result" = "ERR" ]; then
    echo "❌ ${label}: query failed"
    FAILED=$((FAILED + 1))
  elif [ "$result" -lt "$min_expected" ]; then
    echo "❌ ${label}: expected ≥${min_expected}, got ${result}"
    FAILED=$((FAILED + 1))
  else
    echo "✅ ${label}: ${result}"
  fi
}

check "users table" "SELECT COUNT(*) FROM users"
check "offices table" "SELECT COUNT(*) FROM offices"
check "categories table" "SELECT COUNT(*) FROM categories"
check "tasks table" "SELECT COUNT(*) FROM tasks"
check "audit_logs table" "SELECT COUNT(*) FROM audit_logs" 0
check "sessions table" "SELECT COUNT(*) FROM sessions" 0

echo "─────────────────────────────────────────"
echo "Checked: ${CHECKS} · Failed: ${FAILED}"

if [ "$FAILED" -gt 0 ]; then
  echo "❌ ${FAILED} checks failed"
  exit 1
fi
echo "✅ All checks passed"
