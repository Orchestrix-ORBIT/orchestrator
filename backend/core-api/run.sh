#!/bin/bash
# Kills any process on port 8080, then starts the Spring Boot server cleanly.
# Usage: ./run.sh

echo "🔄  Checking port 8080..."
fuser -k 8080/tcp 2>/dev/null && echo "⚠️  Killed previous instance on port 8080" || echo "✅  Port 8080 is free"
sleep 1

if [ -f .env ]; then
  echo "🔑  Loading environment variables from .env..."
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀  Starting core-api..."
./mvnw spring-boot:run
