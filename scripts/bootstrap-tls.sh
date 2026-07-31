#!/usr/bin/env bash
set -euo pipefail

domain_name=${1:-}
email=${2:-}
if [[ -z "$domain_name" || -z "$email" ]]; then
    echo "Usage: $0 <domain> <letsencrypt-email>" >&2
    exit 2
fi

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
deploy_root=$(cd "$script_dir/.." && pwd)
cd "$deploy_root"

export DOMAIN_NAME="$domain_name"
compose=(docker compose --env-file .env.prod --env-file .deploy.env -f docker-compose.prod.yml)

"${compose[@]}" run --rm --entrypoint certbot certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --domain "$domain_name" \
    --email "$email" \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring

"${compose[@]}" restart nginx
sleep 5
curl -fsS "https://$domain_name/actuator/health/readiness" >/dev/null
echo "HTTPS is active for $domain_name"
