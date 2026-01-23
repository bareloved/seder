#!/bin/bash

# Database Backup Script using pg_dump
# Usage: ./scripts/db-backup.sh [options]
#
# Options:
#   -d, --data-only     Backup data only (no schema)
#   -s, --schema-only   Backup schema only (no data)
#   -p, --plain         Use plain SQL format instead of custom format
#   -k, --keep N        Keep only the last N backups (default: 10)
#   -o, --output DIR    Output directory (default: ./backups/db)
#   -h, --help          Show this help message

set -e

# Default values
BACKUP_DIR="./backups/db"
KEEP_BACKUPS=10
FORMAT="custom"  # custom (-Fc) or plain (-Fp)
DATA_ONLY=false
SCHEMA_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--data-only)
            DATA_ONLY=true
            shift
            ;;
        -s|--schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        -p|--plain)
            FORMAT="plain"
            shift
            ;;
        -k|--keep)
            KEEP_BACKUPS="$2"
            shift 2
            ;;
        -o|--output)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -h|--help)
            head -20 "$0" | tail -n +2 | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load DATABASE_URL from .env file
load_env() {
    local env_file=""

    if [[ -f ".env.local" ]]; then
        env_file=".env.local"
    elif [[ -f ".env" ]]; then
        env_file=".env"
    else
        echo "Error: No .env or .env.local file found"
        exit 1
    fi

    echo "Loading environment from $env_file"

    # Export DATABASE_URL from env file
    export DATABASE_URL=$(grep -E "^DATABASE_URL=" "$env_file" | cut -d '=' -f2-)

    if [[ -z "$DATABASE_URL" ]]; then
        echo "Error: DATABASE_URL not found in $env_file"
        exit 1
    fi
}

# Create backup directory if it doesn't exist
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    echo "Backup directory: $BACKUP_DIR"
}

# Generate backup filename
get_backup_filename() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local suffix=""
    local extension="dump"

    if [[ "$DATA_ONLY" == true ]]; then
        suffix="_data"
    elif [[ "$SCHEMA_ONLY" == true ]]; then
        suffix="_schema"
    fi

    if [[ "$FORMAT" == "plain" ]]; then
        extension="sql"
    fi

    echo "${BACKUP_DIR}/backup_${timestamp}${suffix}.${extension}"
}

# Perform the backup
do_backup() {
    local filename=$(get_backup_filename)
    local pg_dump_args=()

    # Set format
    if [[ "$FORMAT" == "custom" ]]; then
        pg_dump_args+=("-Fc")
    else
        pg_dump_args+=("-Fp")
    fi

    # Set data/schema options
    if [[ "$DATA_ONLY" == true ]]; then
        pg_dump_args+=("--data-only")
    elif [[ "$SCHEMA_ONLY" == true ]]; then
        pg_dump_args+=("--schema-only")
    fi

    # Add output file
    pg_dump_args+=("-f" "$filename")

    echo "Starting backup..."
    echo "Format: $FORMAT"
    [[ "$DATA_ONLY" == true ]] && echo "Mode: data only"
    [[ "$SCHEMA_ONLY" == true ]] && echo "Mode: schema only"

    # Run pg_dump
    if pg_dump "${pg_dump_args[@]}" "$DATABASE_URL"; then
        local size=$(du -h "$filename" | cut -f1)
        echo ""
        echo "✅ Backup completed successfully!"
        echo "   File: $filename"
        echo "   Size: $size"
    else
        echo "❌ Backup failed!"
        exit 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    if [[ "$KEEP_BACKUPS" -le 0 ]]; then
        return
    fi

    local count=$(ls -1 "$BACKUP_DIR"/backup_*.{dump,sql} 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$count" -gt "$KEEP_BACKUPS" ]]; then
        local to_delete=$((count - KEEP_BACKUPS))
        echo ""
        echo "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."
        ls -1t "$BACKUP_DIR"/backup_*.{dump,sql} 2>/dev/null | tail -n "$to_delete" | xargs rm -f
        echo "Removed $to_delete old backup(s)"
    fi
}

# Main
main() {
    echo "==================================="
    echo "  Database Backup (pg_dump)"
    echo "==================================="
    echo ""

    load_env
    setup_backup_dir
    do_backup
    cleanup_old_backups

    echo ""
    echo "Done!"
}

main
