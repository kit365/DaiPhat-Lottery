#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================="
echo " Starting all 3 AI Services (Background) "
echo " - eKYC Vision:    http://localhost:8091 "
echo " - Ticket Vision:  http://localhost:8090 "
echo " - Chatbot:        http://localhost:8000 "
echo "=========================================="

bash "${AI_ROOT}/ai-ekyc/scripts/run.sh" &
PID_EKYC=$!

bash "${AI_ROOT}/ai-ticket-ocr/scripts/run.sh" &
PID_TICKET=$!

bash "${AI_ROOT}/ai-chatbot/scripts/run.sh" &
PID_CHATBOT=$!

cleanup() {
  echo ""
  echo ">>> Đang dừng các tiến trình AI..."
  kill -TERM "$PID_EKYC" 2>/dev/null || true
  kill -TERM "$PID_TICKET" 2>/dev/null || true
  kill -TERM "$PID_CHATBOT" 2>/dev/null || true
  wait
  echo ">>> Đã tắt toàn bộ AI Services."
}

trap cleanup SIGINT SIGTERM EXIT

wait
