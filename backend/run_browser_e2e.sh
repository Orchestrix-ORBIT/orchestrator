#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
expected_url='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
if [[ "${SPRING_DATASOURCE_URL:-}" != "$expected_url" ]]; then
  echo "Browser tests require the isolated PostgreSQL URL: $expected_url" >&2
  exit 2
fi
export TENANT_BOOTSTRAP_KEY="${TENANT_BOOTSTRAP_KEY:-integration-bootstrap-key}"
export JWT_SECRET="${JWT_SECRET:-integration-test-only-shared-jwt-secret-2026}"
export ENCRYPTION_SECRET_KEY="${ENCRYPTION_SECRET_KEY:-integration-test-aes-key-1234567}"
export NEXT_PUBLIC_API_URL='http://127.0.0.1:8080'
if [[ -z "${CHROME_BIN:-}" ]] && command -v google-chrome-stable >/dev/null 2>&1; then
  export CHROME_BIN="$(command -v google-chrome-stable)"
fi

core_jar="$(find "$project_root/backend/core-api/target" -maxdepth 1 -name 'core-api-*.jar' ! -name '*.original' -print -quit)"
if [[ -z "$core_jar" ]]; then
  echo 'Build the Core API jar before running browser tests.' >&2
  exit 2
fi

log_dir="$(mktemp -d)"
core_pid=''
next_pid=''
cleanup() {
  result=$?
  if [[ $result -ne 0 ]]; then
    tail -n 60 "$log_dir/core.log" >&2 || true
    tail -n 60 "$log_dir/next.log" >&2 || true
  fi
  for pid in "$core_pid" "$next_pid"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  wait 2>/dev/null || true
  rm -rf "$log_dir"
}
trap cleanup EXIT

java -jar "$core_jar" --server.port=8080 >"$log_dir/core.log" 2>&1 &
core_pid=$!
(cd "$project_root/frontend/orchestrix_orbit_frontend" && exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000) >"$log_dir/next.log" 2>&1 &
next_pid=$!

for url in 'http://127.0.0.1:8080/api/admin/tenants' 'http://127.0.0.1:3000/'; do
  ready=0
  for attempt in {1..90}; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$code" == '403' || "$code" == '200' ]]; then ready=1; break; fi
    sleep 1
  done
  if [[ $ready -ne 1 ]]; then echo "Service did not become ready: $url" >&2; exit 1; fi
done

cd "$project_root/frontend/orchestrix_orbit_frontend"
npm run test:e2e
