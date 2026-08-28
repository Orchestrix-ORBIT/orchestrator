#!/bin/bash

# Orchestrix Context Engine — Startup Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found."
    echo "Run: cp .env.example .env  and fill in your GOOGLE_API_KEY"
    exit 1
fi

# Create and activate virtualenv if not present
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "Starting Orchestrix Context Engine on http://localhost:8083"
echo "Docs available at:  http://localhost:8083/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8083 --reload
