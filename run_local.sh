#!/usr/bin/env bash
# =============================================================================
# ADP Questa Governed Document Ingestion & Search Studio — Local Deploy Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================================================="
echo "  Deploying ADP Questa Governed Studio Locally (FastAPI + React)"
echo "==================================================================="

# 1. Detect Python Runtime
if [ -n "$VIRTUAL_ENV" ]; then
    PYTHON_BIN="$VIRTUAL_ENV/bin/python"
    UVICORN_BIN="$VIRTUAL_ENV/bin/uvicorn"
elif [ -f "$SCRIPT_DIR/../.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/../.venv/bin/python"
    UVICORN_BIN="$SCRIPT_DIR/../.venv/bin/uvicorn"
elif [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
    UVICORN_BIN="$SCRIPT_DIR/.venv/bin/uvicorn"
elif [ -f "venv/bin/python" ]; then
    PYTHON_BIN="venv/bin/python"
    UVICORN_BIN="venv/bin/uvicorn"
else
    PYTHON_BIN="$(command -v python3)"
    UVICORN_BIN="$(command -v uvicorn || echo "uvicorn")"
fi

echo "✔ Python binary: $PYTHON_BIN"

# 2. Check React UI Build
if [ ! -d "ui/dist" ] || [ "$1" == "--build" ] || [ "$1" == "-b" ]; then
    echo "⚙ Building React Frontend UI (Vite + TypeScript)..."
    cd ui
    npm run build
    cd ..
    echo "✔ React UI built successfully to ui/dist/"
else
    echo "✔ React UI production bundle present in ui/dist/"
fi

# 3. Configure Google Cloud Platform Environment
export SPANNER_USE_EMULATOR=false
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-gemini-ai-apigee-security}"
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-gemini-ai-apigee-security}"
export PYTHONPATH="."
export PORT="${PORT:-8080}"
export HOST="${HOST:-0.0.0.0}"

# 4. Clean up any existing stale process holding the port
EXISTING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo "⚡ Port $PORT is already in use by PID $EXISTING_PID. Gracefully recycling..."
    kill -9 $EXISTING_PID 2>/dev/null || true
    sleep 1
fi

echo "✔ GCP Project: $GCP_PROJECT_ID"
echo "✔ Cloud Spanner: adp-test-spanner / adp_governed_knowledge"
echo "✔ GCS Storage Bucket: adp-questa-document-ingest-poc"
echo "✔ Document AI Processor: 6b4ece5cd2c460ab (Location: us)"
echo "==================================================================="
echo "🚀 ADP Questa Studio is LIVE at:"
echo "   👉 Web UI (React SPA):   http://localhost:${PORT}/"
echo "   👉 Swagger API Docs:     http://localhost:${PORT}/docs"
echo "   👉 Health Diagnostics:   http://localhost:${PORT}/health"
echo "==================================================================="

# 5. Launch FastAPI Uvicorn Server
exec "$UVICORN_BIN" app.main:app --host "$HOST" --port "$PORT" --reload
