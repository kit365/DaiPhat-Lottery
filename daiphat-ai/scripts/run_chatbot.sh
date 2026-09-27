#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo ">>> Starting AI Chatbot Service..."
exec bash "${AI_ROOT}/ai-chatbot/scripts/run.sh" "$@"
