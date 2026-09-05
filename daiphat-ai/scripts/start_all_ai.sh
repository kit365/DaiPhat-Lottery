#!/bin/sh
# Start chat-bot (8000) and ticket-vision (8090) in one container.
# Used by daiphat-ai/Dockerfile so `docker compose up ai` runs all AI APIs.
set -eu

CHAT_PID=""
TV_PID=""

shutdown() {
    if [ -n "${CHAT_PID}" ]; then
        kill -TERM "${CHAT_PID}" 2>/dev/null || true
    fi
    if [ -n "${TV_PID}" ]; then
        kill -TERM "${TV_PID}" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
}

trap shutdown INT TERM EXIT

PYTHONPATH=/app:/app/services/chat-bot \
    uvicorn main:app --app-dir services/chat-bot --host 0.0.0.0 --port 8000 &
CHAT_PID=$!

PYTHONPATH=/app:/app/services/ticket-vision \
    uvicorn main:app --app-dir services/ticket-vision --host 0.0.0.0 --port 8090 &
TV_PID=$!

# Stay up while both children are alive; exit if either dies.
while kill -0 "${CHAT_PID}" 2>/dev/null && kill -0 "${TV_PID}" 2>/dev/null; do
    sleep 2
done

echo "One AI process exited; shutting down the other." >&2
shutdown
exit 1
