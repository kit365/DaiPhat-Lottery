#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
deploy_root=$(cd "$script_dir/.." && pwd)
cd "$deploy_root"

for required_file in docker-compose.prod.yml .env.prod .deploy.env .dozzle/users.yml; do
    [[ -s "$required_file" ]] || {
        echo "Missing required deployment file: $required_file" >&2
        exit 1
    }
done

chmod 600 .env.prod .deploy.env
chmod 700 .dozzle
chmod 600 .dozzle/users.yml
mkdir -p backups/postgres
chmod 700 backups backups/postgres

compose() {
    docker compose \
        --env-file .env.prod \
        --env-file .deploy.env \
        -f docker-compose.prod.yml "$@"
}

wait_for_health() {
    local service=$1
    local timeout_seconds=${2:-300}
    local elapsed=0
    local container_id status

    while (( elapsed < timeout_seconds )); do
        container_id=$(compose ps -q "$service")
        if [[ -n "$container_id" ]]; then
            status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
            if [[ "$status" == "healthy" ]]; then
                return 0
            fi
            if [[ "$status" == "unhealthy" || "$status" == "exited" ]]; then
                return 1
            fi
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    return 1
}

rollback() {
    local status=$1
    set +e
    failure_log="deploy-failure-$(date +%Y%m%d_%H%M%S).log"
    compose logs --no-color --tail=250 ai backend frontend nginx dozzle > "$failure_log" 2>&1
    chmod 600 "$failure_log"
    echo "Deployment failed; logs saved to $deploy_root/$failure_log" >&2

    if [[ -s .last-successful.env ]]; then
        cp .last-successful.env .deploy.env
        chmod 600 .deploy.env
        compose pull ai backend frontend
        compose up -d ai backend frontend nginx
        wait_for_health ai 180
        wait_for_health backend 300
        wait_for_health frontend 120
        wait_for_health nginx 120
        echo "Application images rolled back. Database migrations were not rolled back." >&2
    else
        echo "No previous successful image pair exists; automatic rollback was skipped." >&2
    fi
    exit "$status"
}

trap 'rollback $?' ERR

compose config --quiet
compose pull postgres redis nginx certbot docker-socket-proxy dozzle
compose up -d postgres redis
wait_for_health postgres 180
wait_for_health redis 120

echo "Creating the mandatory pre-deploy database backup"
compose build db-backup
compose run --rm db-backup run

compose pull ai backend frontend
compose up -d ai backend frontend nginx certbot docker-socket-proxy dozzle db-backup
wait_for_health ai 180
wait_for_health backend 360
wait_for_health frontend 180
wait_for_health nginx 180
wait_for_health dozzle 120

curl -fsS http://127.0.0.1/actuator/health/readiness >/dev/null

cp .deploy.env .last-successful.env
chmod 600 .last-successful.env
trap - ERR

echo "Deployment completed successfully."
compose ps
