#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_ROOT="$(dirname "${SERVICE_DIR}")"
PORT="${LOCAL_CHATBOT_PORT:-${PORT:-8000}}"

cd "${SERVICE_DIR}"

for env_file in "${AI_ROOT}/.env" "${AI_ROOT}/../.env" "${SERVICE_DIR}/.env"; do
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
    break
  fi
done

# Reuse shared daiphat-ai/.venv when present
VENV_DIR="${SERVICE_DIR}/.venv"
if [[ ! -x "${VENV_DIR}/bin/python" && ! -x "${VENV_DIR}/Scripts/python.exe" ]]; then
  if [[ -x "${AI_ROOT}/.venv/bin/python" || -x "${AI_ROOT}/.venv/Scripts/python.exe" ]]; then
    VENV_DIR="${AI_ROOT}/.venv"
  fi
fi

PYTHON_BIN="${VENV_DIR}/bin/python"
if [[ ! -x "${PYTHON_BIN}" && -x "${VENV_DIR}/Scripts/python.exe" ]]; then
  PYTHON_BIN="${VENV_DIR}/Scripts/python.exe"
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo ">>> Đang tạo virtual environment tại ${VENV_DIR}..."
  python3 -m venv "${VENV_DIR}" 2>/dev/null || python -m venv "${VENV_DIR}"
  if [[ -x "${VENV_DIR}/bin/python" ]]; then
    PYTHON_BIN="${VENV_DIR}/bin/python"
  else
    PYTHON_BIN="${VENV_DIR}/Scripts/python.exe"
  fi
fi

if [[ -f "${SERVICE_DIR}/requirements.txt" ]]; then
  "${PYTHON_BIN}" -m pip install -q -r "${SERVICE_DIR}/requirements.txt" 2>/dev/null || true
fi

export PYTHONPATH="${SERVICE_DIR}"

echo ">>> Khởi động AI Chatbot trên http://0.0.0.0:${PORT} (Swagger docs: http://localhost:${PORT}/docs)"
exec "${PYTHON_BIN}" -m uvicorn main:app \
  --app-dir "${SERVICE_DIR}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --reload
