#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo ">>> Starting Ticket Vision OCR Service..."
exec bash "${AI_ROOT}/ai-ticket-ocr/scripts/run.sh" "$@"
