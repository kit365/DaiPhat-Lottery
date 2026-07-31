#!/usr/bin/env bash
set -euo pipefail

deploy_path=${1:-}
if [[ -z "$deploy_path" ]]; then
    echo "Usage: $0 <absolute-vps-deploy-path>" >&2
    exit 2
fi

for command_name in docker curl openssl ss; do
    command -v "$command_name" >/dev/null 2>&1 || {
        echo "Missing required command: $command_name" >&2
        exit 1
    }
done

docker info >/dev/null
docker compose version >/dev/null

memory_mb=$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)
swap_mb=$(awk '/SwapTotal/ {print int($2 / 1024)}' /proc/meminfo)
available_mb=$(df -Pm "$(dirname "$deploy_path")" | awk 'NR == 2 {print $4}')

echo "RAM: ${memory_mb} MB"
echo "Swap: ${swap_mb} MB"
echo "Available disk near deploy path: ${available_mb} MB"

(( memory_mb >= 3500 )) || echo "WARNING: less than 3.5 GB RAM detected." >&2
(( swap_mb >= 1800 )) || echo "WARNING: configure approximately 2 GB swap before production traffic." >&2
(( available_mb >= 10240 )) || {
    echo "At least 10 GB free disk is required." >&2
    exit 1
}

if ss -ltn | awk '{print $4}' | grep -Eq '(^|:)(80|443)$'; then
    echo "WARNING: port 80 or 443 is already in use; confirm it belongs to the DaiPhat stack." >&2
fi

echo "VPS preflight completed. Firewall should expose only SSH, 80 and 443."
