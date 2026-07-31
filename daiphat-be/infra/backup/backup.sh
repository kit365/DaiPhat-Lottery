#!/bin/sh
set -eu

backup_dir=${BACKUP_DIR:-/backups}
backup_time=${BACKUP_TIME:-02:30}
local_retention_days=${LOCAL_RETENTION_DAYS:-7}

require_environment() {
    for variable in PGHOST PGDATABASE PGUSER PGPASSWORD RESTIC_REPOSITORY RESTIC_PASSWORD; do
        eval "value=\${$variable:-}"
        if [ -z "$value" ]; then
            echo "Missing required environment variable: $variable" >&2
            exit 1
        fi
    done
}

run_backup() {
    require_environment
    umask 077
    mkdir -p "$backup_dir"

    timestamp=$(date +%Y%m%d_%H%M%S)
    dump_file=${backup_dir}/${PGDATABASE}_${timestamp}.dump
    temporary_file=${dump_file}.tmp

    echo "Creating PostgreSQL dump: $dump_file"
    pg_dump --format=custom --compress=9 --file="$temporary_file"
    mv "$temporary_file" "$dump_file"

    if ! restic snapshots >/dev/null 2>&1; then
        restic init
    fi

    restic backup "$dump_file" --tag daiphat-prod --host "${BACKUP_HOST:-daiphat-vps}"
    restic forget --prune \
        --keep-daily "${RESTIC_KEEP_DAILY:-30}" \
        --keep-weekly "${RESTIC_KEEP_WEEKLY:-8}" \
        --keep-monthly "${RESTIC_KEEP_MONTHLY:-12}"

    find "$backup_dir" -type f -name '*.dump' -mtime "+$local_retention_days" -delete
    echo "Backup completed: $dump_file"
}

run_daemon() {
    require_environment
    echo "Backup scheduler started; daily run at $backup_time ($TZ)."

    while :; do
        now_epoch=$(date +%s)
        today=$(date +%F)
        target_epoch=$(date -d "$today $backup_time" +%s)
        if [ "$target_epoch" -le "$now_epoch" ]; then
            target_epoch=$(date -d "tomorrow $backup_time" +%s)
        fi
        sleep_seconds=$((target_epoch - now_epoch))
        sleep "$sleep_seconds"
        run_backup || echo "Scheduled backup failed; will retry at the next scheduled run." >&2
    done
}

case "${1:-daemon}" in
    run)
        run_backup
        ;;
    daemon)
        run_daemon
        ;;
    *)
        echo "Usage: backup.sh [run|daemon]" >&2
        exit 2
        ;;
esac
