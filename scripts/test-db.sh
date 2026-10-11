#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="toeic-db-test-$$"
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for sql in tests/database/bootstrap.sql supabase/migrations/*.sql tests/database/persistence.sql tests/database/personal-drive.sql tests/database/retention.sql tests/database/qna.sql tests/database/daily-rc.sql tests/database/hackers-reports.sql; do
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < "$sql" >/dev/null
done
printf 'Database integration checks passed.\n'
