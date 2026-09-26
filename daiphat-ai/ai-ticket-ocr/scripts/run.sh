#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_ROOT="$(dirname "${SERVICE_DIR}")"
PORT="${PORT:-8090}"

cd "${SERVICE_DIR}"

for env_file in "${AI_ROOT}/.env" "${AI_ROOT}/../.env"; do
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
    break
  fi
done

# Reuse the pre-split shared daiphat-ai/.venv when present; OCR deps are several GB.
VENV_DIR="${SERVICE_DIR}/.venv"
if [[ ! -x "${VENV_DIR}/bin/python" && -x "${AI_ROOT}/.venv/bin/python" ]]; then
  VENV_DIR="${AI_ROOT}/.venv"
fi
if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install -q -r "${SERVICE_DIR}/requirements.txt"

export PYTHONPATH="${SERVICE_DIR}"
# Avoid PaddleOCR vs protobuf 4+/5+ descriptor crash.
export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION="${PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION:-python}"

exec "${VENV_DIR}/bin/uvicorn" main:app \
  --app-dir "${SERVICE_DIR}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --reload
