#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
commit_sha=$(git rev-parse --verify HEAD)
snapshot_dir=$(mktemp -d)
project_name="daiphat-preflight-$$"

cleanup() {
    if [[ -f "$snapshot_dir/docker-compose.yml" ]]; then
        docker compose -p "$project_name" -f "$snapshot_dir/docker-compose.yml" down --remove-orphans >/dev/null 2>&1 || true
    fi
    rm -rf "$snapshot_dir"
}
trap cleanup EXIT

for command_name in git docker curl tar; do
    command -v "$command_name" >/dev/null 2>&1 || {
        echo "Missing required command: $command_name" >&2
        exit 1
    }
done

docker info >/dev/null

[[ -f "$repo_root/.env" ]] || {
    echo "Missing $repo_root/.env" >&2
    exit 1
}

echo "Creating a clean preflight snapshot from commit $commit_sha"
git -C "$repo_root" archive --format=tar HEAD | tar -xf - -C "$snapshot_dir"
cp "$repo_root/.env" "$snapshot_dir/.env"

compose=(docker compose -p "$project_name" -f "$snapshot_dir/docker-compose.yml")

echo "Validating Compose configuration"
"${compose[@]}" config --quiet

echo "Building AI, backend and frontend images"
"${compose[@]}" build ai backend frontend

echo "Starting the production-like local stack"
"${compose[@]}" up -d postgres redis ai backend frontend

wait_for_health() {
    local service=$1
    local timeout_seconds=${2:-300}
    local elapsed=0
    local container_id status

    while (( elapsed < timeout_seconds )); do
        container_id=$("${compose[@]}" ps -q "$service")
        if [[ -n "$container_id" ]]; then
            status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
            if [[ "$status" == "healthy" ]]; then
                return 0
            fi
            if [[ "$status" == "unhealthy" || "$status" == "exited" ]]; then
                "${compose[@]}" logs --tail=200 "$service"
                return 1
            fi
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done

    "${compose[@]}" logs --tail=200 "$service"
    echo "Timed out waiting for $service to become healthy" >&2
    return 1
}

wait_for_health ai 120
wait_for_health backend
wait_for_health frontend 120

curl -fsS http://127.0.0.1:${LOCAL_BACKEND_PORT:-8080}/actuator/health/readiness >/dev/null
curl -fsS http://127.0.0.1:${LOCAL_AI_PORT:-8000}/health >/dev/null
curl -fsS http://127.0.0.1:${LOCAL_FRONTEND_PORT:-5173}/ >/dev/null

proxy_status=$(curl -sS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:${LOCAL_FRONTEND_PORT:-5173}/api/v1/auth/password-policy)
if [[ "$proxy_status" -ge 500 ]]; then
    echo "Frontend-to-backend proxy returned HTTP $proxy_status" >&2
    exit 1
fi

echo "Preflight passed for commit $commit_sha"
echo "It is safe to push this commit and run the manual VPS deployment workflow."
