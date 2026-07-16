#!/bin/sh

set -u

app_pid=""

stop_app() {
  if [ -n "$app_pid" ]; then
    kill "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
}

trap 'stop_app; exit 0' INT TERM

while true; do
  mvn -DskipTests spring-boot:run &
  app_pid=$!
  source_changed=0

  while kill -0 "$app_pid" 2>/dev/null; do
    if inotifywait -qq -r -t 2 \
      -e modify,create,delete,move \
      --exclude '(^|/)(target|\.git)(/|$)' \
      src pom.xml; then
      source_changed=1
      stop_app
      break
    fi
  done

  wait "$app_pid" 2>/dev/null || true
  app_pid=""

  if [ "$source_changed" -eq 0 ]; then
    sleep 2
  fi
done
