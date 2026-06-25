#!/bin/bash
set -euo pipefail

echo "Running database migrations..."
for f in /migrations/*.sql; do
  echo "  -> $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -U postgres -d aria -f "$f"
done

echo "Running seed data..."
psql -v ON_ERROR_STOP=1 -U postgres -d aria -f /seed/seed.sql

echo "Granting table permissions to API roles..."
psql -v ON_ERROR_STOP=1 -U postgres -d aria <<'EOSQL'
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
EOSQL

echo "Database initialization complete."
