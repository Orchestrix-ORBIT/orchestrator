#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
expected_url='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
if [[ "${SPRING_DATASOURCE_URL:-}" != "$expected_url" ]]; then
  echo "Cross-service tests require the isolated PostgreSQL URL: $expected_url" >&2
  exit 2
fi

context_python="${CONTEXT_PYTHON:-python3}"
log_dir="$(mktemp -d)"
core_pid=''
realtime_pid=''
context_pid=''
cleanup() {
  result=$?
  if [[ $result -ne 0 ]]; then
    for service in core realtime context; do
      echo "--- $service log ---" >&2
      tail -n 80 "$log_dir/$service.log" >&2 || true
    done
  fi
  for pid in "$core_pid" "$realtime_pid" "$context_pid"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  wait 2>/dev/null || true
  rm -rf "$log_dir"
}
trap cleanup EXIT

core_jar="$(find "$project_root/backend/core-api/target" -maxdepth 1 -name 'core-api-*.jar' ! -name '*.original' -print -quit)"
realtime_jar="$(find "$project_root/backend/realtime-service/target" -maxdepth 1 -name 'realtime-service-*.jar' ! -name '*.original' -print -quit)"
if [[ -z "$core_jar" || -z "$realtime_jar" ]]; then
  echo 'Build both backend jars with Maven package before running cross-service tests.' >&2
  exit 2
fi

java -jar "$core_jar" --server.port=8080 >"$log_dir/core.log" 2>&1 &
core_pid=$!
java -jar "$realtime_jar" --server.port=8082 >"$log_dir/realtime.log" 2>&1 &
realtime_pid=$!
(cd "$project_root/backend/context-engine" && "$context_python" -m uvicorn integration_stub:app --app-dir tests --host 127.0.0.1 --port 8083) >"$log_dir/context.log" 2>&1 &
context_pid=$!

for url in 'http://127.0.0.1:8080/api/admin/tenants' 'http://127.0.0.1:8082/ws/info' 'http://127.0.0.1:8083/'; do
  ready=0
  for attempt in {1..90}; do
    if curl -fsS "$url" >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  if [[ $ready -ne 1 ]]; then echo "Service did not become ready: $url" >&2; exit 1; fi
done

cd "$project_root/frontend/orchestrix_orbit_frontend"
CROSS_SERVICE_INTEGRATION=1 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080 \
NEXT_PUBLIC_CHAT_API_URL=http://127.0.0.1:8082 \
NEXT_PUBLIC_CHAT_WS_URL=http://127.0.0.1:8082/ws \
NEXT_PUBLIC_CONTEXT_ENGINE_URL=http://127.0.0.1:8083 \
npm run test:run -- integration/crossServices.it.test.ts
