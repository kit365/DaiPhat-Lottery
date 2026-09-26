#!/usr/bin/env bash
# Chạy eduspace-ai trên máy (dev). Dùng từ thư mục eduspace-ai-service:
#   chmod +x run-local.sh && ./run-local.sh

set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate

echo ">>> pip upgrade"
python -m pip install --upgrade pip

echo ">>> pip install -r requirements.txt"
pip install -r requirements.txt

export KYC_AI_API_KEY="${KYC_AI_API_KEY:-dev-kyc-ai-secret}"

echo ">>> http://127.0.0.1:8000/docs  (Ctrl+C để dừng)"
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
