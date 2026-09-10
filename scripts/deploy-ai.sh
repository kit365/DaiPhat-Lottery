#!/usr/bin/env bash
# Invoked under the same VPS flock as the other component deployments.
set -Eeuo pipefail
umask 077
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${1:-}" in
  ai) component=chatbot; port=8000; endpoint=http://ai-gateway:8000 ;;
  ticket-vision) component=ocr; port=8090; endpoint=http://ticket-vision:8090 ;;
  *) echo 'Usage: deploy-ai.sh <ai|ticket-vision> <image@sha256:digest> <source-sha>' >&2; exit 2 ;;
esac
image=${2:?Image digest required}
source_sha=${3:?Source SHA required}
[[ "$image" =~ ^[a-zA-Z0-9./_-]+@sha256:[a-f0-9]{64}$ ]] || exit 2
[[ "$source_sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ -f .ai-runtime.env ]] || { echo 'Missing staged AI runtime configuration' >&2; exit 1; }
trap 'rm -f .ai-runtime.env' EXIT

state=.ai-deploy/$component
for name in chatbot ocr; do
  mkdir -p ".ai-deploy/$name/nginx"
  for colour in blue green; do
    [[ -f ".ai-deploy/$name/$colour.env" ]] || touch ".ai-deploy/$name/$colour.env"
  done
done
[[ -f .ai-deploy/images.env ]] || touch .ai-deploy/images.env
if compgen -G "$state/transaction.*" >/dev/null; then
  echo 'An interrupted deployment needs recovery before another slot can be replaced.' >&2
  exit 1
fi
active=
[[ ! -f "$state/active" ]] || active=$(cat "$state/active")
[[ -z "$active" || "$active" == blue || "$active" == green ]] || exit 1
slot=blue
[[ "$active" != blue ]] || slot=green
service=$component-$slot
router=$component-router
runtime=.ai-runtime.env

compose() {
  docker compose --env-file "$runtime" --env-file .ai-deploy/images.env -f docker-compose.ai.yml "$@"
}
healthy() {
  local id status attempts=${2:-60}
  for ((i=0; i<attempts; i++)); do
    id=$(compose ps -aq "$1")
    if [[ -n "$id" ]]; then
      status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")
      [[ "$status" != healthy ]] || return 0
      [[ "$status" != exited && "$status" != dead ]] || return 1
    fi
    sleep 5
  done
  return 1
}
drained() {
  local id
  id=$(compose ps -q "$router")
  [[ -n "$id" ]] || return 0
  # Old nginx workers retain in-flight requests through a graceful reload.
  for ((j=0; j<120; j++)); do
    local processes
    processes=$(docker top "$id" -eo args) || return 1
    if ! grep -q '[w]orker process is shutting down' <<< "$processes"; then
      return 0
    fi
    sleep 5
  done
  return 1
}
write_route() {
  local upstream=$1
  cat > "$state/nginx/default.conf.next" <<EOF
server {
    listen 8080;
    location = /router-health { access_log off; return 200 'up'; }
}
server {
    listen $port;
    client_max_body_size 6m;
    resolver 127.0.0.11 valid=10s ipv6=off;
    location / {
        set \$ai_upstream $upstream;
        add_header X-DaiPhat-AI-Slot "$upstream" always;
        proxy_pass http://\$ai_upstream:$port;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_next_upstream off;
        proxy_read_timeout 65s;
        proxy_send_timeout 65s;
    }
}

EOF
  mv "$state/nginx/default.conf.next" "$state/nginx/default.conf"
}

route_ready() {
  local headers expected=${1:-$service}
  for ((k=0; k<24; k++)); do
    if headers=$(compose exec -T "$router" wget -S -O /dev/null "http://127.0.0.1:$port/health" 2>&1) &&
       grep -Fq "X-DaiPhat-AI-Slot: $expected" <<< "$headers"; then
      return 0
    fi
    sleep 5
  done
  return 1
}

# Admission control for overlapping slots; never stop the serving slot to make room.
memory_key=AI_CHATBOT_MEMORY_LIMIT
memory_default=256m
[[ "$component" != ocr ]] || { memory_key=TICKET_VISION_MEMORY_LIMIT; memory_default=1g; }
memory_limit=$(awk -F= -v key="$memory_key" '$1==key {v=substr($0,length(key)+2)} END {print v}' .ai-runtime.env)
memory_limit=${memory_limit:-$memory_default}
memory_limit=${memory_limit//\"/}
memory_limit=${memory_limit//\'/}
[[ "$memory_limit" =~ ^[0-9]+([kKmMgG][bB]?|[bB])?$ ]] || { echo 'Unsupported AI memory limit.' >&2; exit 1; }
requested_mb=$(awk -v limit="$memory_limit" 'BEGIN {unit=tolower(limit); value=limit+0; if(unit ~ /g/) value*=1024; else if(unit ~ /k/) value/=1024; else if(unit !~ /m/) value/=1048576; print int(value+0.999)}')
available_mb=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
(( available_mb >= requested_mb + 640 )) || { echo 'Not enough available RAM for the new slot and gateway; active services retained.' >&2; exit 1; }
if [[ "$component" == ocr ]]; then
  total_mb=$(awk '/MemTotal:/ {print int($2/1024)}' /proc/meminfo)
  docker_root=$(docker info --format '{{.DockerRootDir}}')
  free_mb=$(df -Pm "$docker_root" | awk 'NR==2 {print $4}')
  (( total_mb >= 5500 && free_mb >= 25600 )) || { echo 'OCR requires 5500 MiB host RAM and 25 GiB free Docker disk; deployment stopped.' >&2; exit 1; }
fi

# Never take over an already-running direct OCR endpoint by recreating it.
legacy=$(docker ps -q --filter label=com.docker.compose.project=daiphat-prod --filter "label=com.docker.compose.service=${1}")
if [[ "$component" == ocr && -n "$legacy" ]]; then
  echo 'A legacy ticket-vision container owns the endpoint; migrate its traffic before enabling blue/green CD.' >&2
  exit 1
fi

# Bootstrap a gateway forwarding to the live chatbot without touching that container.
# Backend migration is separate: CD must not restart the backend to change its URL.
backend=$(docker ps -q --filter label=com.docker.compose.project=daiphat-prod --filter label=com.docker.compose.service=backend)
[[ -n "$backend" && "$backend" != *$'\n'* ]] || { echo 'Expected one existing production backend.' >&2; exit 1; }
network=$(awk -F= '$1=="AI_DOCKER_NETWORK" {v=substr($0,length($1)+2)} END {print v}' .ai-runtime.env)
network=${network:-daiphat-prod_default}
network=${network//\"/}
network=${network//\'/}
[[ "$network" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 1
backend_network=$(docker inspect --format "{{with index .NetworkSettings.Networks \"$network\"}}{{.NetworkID}}{{end}}" "$backend")
[[ -n "$backend_network" ]] || { echo 'AI_DOCKER_NETWORK must be an existing network attached to the backend.' >&2; exit 1; }
router_id=$(compose ps -q "$router")
if [[ -n "$router_id" ]]; then
  router_network=$(docker inspect --format "{{with index .NetworkSettings.Networks \"$network\"}}{{.NetworkID}}{{end}}" "$router_id")
  [[ "$router_network" == "$backend_network" ]] || { echo 'Gateway network changes require a separate migration.' >&2; exit 1; }
fi
if [[ "$component" == chatbot && -z "$active" && ! -f "$state/nginx/default.conf" ]]; then
  [[ -n "$legacy" ]] || { echo 'No chatbot baseline available for gateway bootstrap.' >&2; exit 1; }
  write_route ai
  compose up -d --no-deps "$router"
  healthy "$router" 24
fi
key=DAIPHAT_TICKET_VISION_BASE_URL
[[ "$component" != chatbot ]] || key=DAIPHAT_AI_BASE_URL
actual=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$backend" | awk -F= -v key="$key" '$1==key {print substr($0,length(key)+2)}')
if [[ "${actual%/}" != "$endpoint" ]]; then
  echo "Backend must use $key=$endpoint before this component can receive traffic. Existing backend was not restarted." >&2
  exit 1
fi

# Do not replace an inactive slot still serving requests from an earlier reload.
drained || { echo 'Previous requests are still draining; keeping both slots.' >&2; exit 1; }
backup=$(mktemp -d "$state/transaction.XXXXXX")
cp .ai-deploy/images.env "$backup/images.env"
cp "$state/$slot.env" "$backup/slot.env"
had_route=false
if [[ -f "$state/nginx/default.conf" ]]; then
  cp "$state/nginx/default.conf" "$backup/default.conf"
  had_route=true
fi
switched=false
rollback() {
  local status=$?
  local restored=true
  # Let the parent shell perform the rollback once when a command substitution fails.
  if (( BASH_SUBSHELL > 0 )); then
    exit "$status"
  fi
  trap - ERR INT TERM
  set +e
  echo "$component deployment failed; restoring the previous route." >&2
  if [[ "$had_route" == true ]]; then
    cp "$backup/default.conf" "$state/nginx/default.conf.next"
    mv "$state/nginx/default.conf.next" "$state/nginx/default.conf"
    if [[ "$switched" == true ]]; then
      if ! compose exec -T "$router" nginx -t || ! compose exec -T "$router" nginx -s reload; then
        restored=false
      else
        previous_upstream=$(awk '/set \$ai_upstream / {gsub(/;/,"",$3); print $3}' "$backup/default.conf")
        if [[ -z "$previous_upstream" ]] || ! route_ready "$previous_upstream"; then
          restored=false
        fi
      fi
    fi
  else
    compose stop "$router"
    rm -f "$state/nginx/default.conf"
  fi
  if [[ "$restored" == true ]] && drained; then
    compose stop "$service"
    cp "$backup/slot.env" "$state/$slot.env"
    cp "$backup/images.env" .ai-deploy/images.env
  else
    echo "Keeping both slots and recovery files at $backup; route recovery or drainage is incomplete." >&2
    exit 1
  fi
  rm -rf "$backup"
  exit "${status:-1}"
}
trap rollback ERR
trap 'false' INT TERM

cp .ai-runtime.env "$state/$slot.env.next"
mv "$state/$slot.env.next" "$state/$slot.env"
runtime=$state/$slot.env
image_key=$(printf '%s_%s_IMAGE' "$component" "$slot" | tr '[:lower:]' '[:upper:]')
awk -F= -v key="$image_key" -v value="$image" '
  $1 != key {print}
  END {print key "=" value}
' .ai-deploy/images.env > .ai-deploy/images.env.next
mv .ai-deploy/images.env.next .ai-deploy/images.env
compose pull "$service"
compose up -d --no-deps "$service"
healthy "$service"

write_route "$service"
if [[ -n "$(compose ps -q "$router")" ]]; then
  compose exec -T "$router" nginx -t
  switched=true
  compose exec -T "$router" nginx -s reload
else
  switched=true
  compose up -d --no-deps "$router"
fi
healthy "$router" 24
route_ready
healthy "$service" 3

# Commit state only after traffic has switched. Older release metadata stays available.
mkdir -p "$state/releases"
release_id="$(date -u +%Y%m%dT%H%M%SZ)-$source_sha-$slot"
image_source=$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
[[ "$image_source" =~ ^[a-f0-9]{40}$ ]] || image_source=unknown
cp "$state/$slot.env" "$state/releases/$release_id.runtime.env"
runtime_hash=$(sha256sum "$state/$slot.env" | awk '{print $1}')
{
  printf 'DEPLOY_SOURCE_SHA=%s\nIMAGE_SOURCE_SHA=%s\nIMAGE=%s\nSLOT=%s\nRUNTIME_SHA256=%s\n' "$source_sha" "$image_source" "$image" "$slot" "$runtime_hash"
} > "$state/releases/$release_id.env"
printf '%s\n' "$slot" > "$state/active.next"
mv "$state/active.next" "$state/active"
trap - ERR INT TERM
rm -rf "$backup"
if [[ -n "$active" ]]; then
  if drained; then
    compose stop "$component-$active"
  else
    echo 'Old slot remains running while requests finish; next rollout will wait for drainage.'
  fi
fi
echo "$component deployed at $image; backend and other AI component were not restarted."
