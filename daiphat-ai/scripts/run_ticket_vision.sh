#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="${ROOT_DIR}/services/ticket-vision"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
PORT="${PORT:-8090}"

cd "${ROOT_DIR}"

if [[ ! -x "${VENV_PYTHON}" ]]; then
  python3 -m venv "${ROOT_DIR}/.venv"
  VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
fi

"${VENV_PYTHON}" -m pip install -q -r "${SERVICE_DIR}/requirements.txt"

export PYTHONPATH="${ROOT_DIR}:${SERVICE_DIR}"

exec "${ROOT_DIR}/.venv/bin/uvicorn" app.main:app \
  --app-dir "${SERVICE_DIR}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --reload
