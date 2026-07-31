#!/usr/bin/env bash
set -euo pipefail

component=${1:-}
image=${2:-}
deploy_sha=${3:-}

case "$component" in
    backend) image_var=BACKEND_IMAGE ;;
    frontend) image_var=FRONTEND_IMAGE ;;
    ai) image_var=AI_IMAGE ;;
    *)
        echo "Usage: $0 <backend|frontend|ai> <immutable-image> <deploy-sha>" >&2
        exit 1
        ;;
esac

[[ -n "$image" && -n "$deploy_sha" ]] || {
    echo "Image and deploy SHA are required." >&2
    exit 1
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
deploy_root=$(cd "$script_dir/.." && pwd)
cd "$deploy_root"

for required_file in docker-compose.prod.yml .env.prod .deploy.env .dozzle/users.yml; do
    [[ -s "$required_file" ]] || {
        echo "Missing required deployment file: $required_file" >&2
        exit 1
    }
done

for required_var in BACKEND_IMAGE FRONTEND_IMAGE AI_IMAGE DEPLOY_SHA; do
    grep -q "^${required_var}=." .deploy.env || {
        echo "Missing required deployment value: $required_var" >&2
        exit 1
    }
done

chmod 600 .env.prod .deploy.env .dozzle/users.yml
chmod 700 .dozzle
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

set_deploy_value() {
    local key=$1
    local value=$2
    local temporary_file
    temporary_file=$(mktemp .deploy.env.XXXXXX)
    awk -F= -v key="$key" -v value="$value" '
        BEGIN { updated = 0 }
        $1 == key { print key "=" value; updated = 1; next }
        { print }
        END { if (!updated) print key "=" value }
    ' .deploy.env > "$temporary_file"
    chmod 600 "$temporary_file"
    mv "$temporary_file" .deploy.env
}

previous_env=$(mktemp .deploy.previous.XXXXXX)
cp .deploy.env "$previous_env"
chmod 600 "$previous_env"

rollback() {
    local status=$1
    set +e
    failure_log="deploy-${component}-failure-$(date +%Y%m%d_%H%M%S).log"
    compose logs --no-color --tail=250 "$component" > "$failure_log" 2>&1
    chmod 600 "$failure_log"
    echo "$component deployment failed; logs saved to $deploy_root/$failure_log" >&2

    cp "$previous_env" .deploy.env
    chmod 600 .deploy.env
    compose pull "$component"
    compose up -d --no-deps "$component"
    if [[ "$component" == "ai" ]]; then
        compose restart backend
    fi
    echo "$component image rolled back. Database migrations were not rolled back." >&2
    rm -f "$previous_env"
    exit "$status"
}

trap 'rollback $?' ERR

compose config --quiet

if [[ "$component" == "backend" ]]; then
    echo "Creating the mandatory pre-deploy database backup"
    compose build db-backup
    compose run --rm db-backup run
fi

set_deploy_value "$image_var" "$image"
set_deploy_value DEPLOY_SHA "$deploy_sha"

compose pull "$component"
compose up -d --no-deps "$component"

case "$component" in
    backend) wait_for_health backend 360 ;;
    frontend) wait_for_health frontend 180 ;;
    ai)
        wait_for_health ai 180
        compose restart backend
        wait_for_health backend 360
        ;;
esac

cp .deploy.env .last-successful.env
chmod 600 .last-successful.env
rm -f "$previous_env"
trap - ERR

echo "$component deployment completed successfully."
compose ps "$component"
