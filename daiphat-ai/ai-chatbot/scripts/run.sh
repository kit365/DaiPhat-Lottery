#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${SERVICE_DIR}/.venv"
PORT="${PORT:-8000}"

cd "${SERVICE_DIR}"

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install -q -r "${SERVICE_DIR}/requirements.txt"

export PYTHONPATH="${SERVICE_DIR}"

exec "${VENV_DIR}/bin/uvicorn" main:app \
  --app-dir "${SERVICE_DIR}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --reload
