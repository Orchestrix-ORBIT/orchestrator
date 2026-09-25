#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing realtime-service/.env" >&2
  exit 1
fi

set -a
source .env
set +a

exec ./mvnw spring-boot:run
