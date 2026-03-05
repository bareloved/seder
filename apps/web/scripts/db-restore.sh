#!/bin/bash

# Database Restore Script using pg_restore
# Usage: ./scripts/db-restore.sh <backup_file> [options]
#
# Arguments:
#   backup_file         Path to the backup file (.dump or .sql)
#
# Options:
#   -c, --clean         Drop existing objects before restore
#   -d, --data-only     Restore data only (no schema)
#   -s, --schema-only   Restore schema only (no data)
#   -t, --table TABLE   Restore only specific table(s) (can be repeated)
#   -l, --list          List contents of backup without restoring
#   --dry-run           Show what would be done without executing
#   -h, --help          Show this help message
#
# Examples:
#   ./scripts/db-restore.sh backups/db/backup_20240115.dump
#   ./scripts/db-restore.sh backups/db/backup_20240115.dump --clean
#   ./scripts/db-restore.sh backups/db/backup_20240115.dump --list
#   ./scripts/db-restore.sh backups/db/backup_20240115.dump -t income_entries

set -e

# Default values
CLEAN=false
DATA_ONLY=false
SCHEMA_ONLY=false
LIST_ONLY=false
DRY_RUN=false
TABLES=()
BACKUP_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -d|--data-only)
            DATA_ONLY=true
            shift
            ;;
        -s|--schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        -t|--table)
            TABLES+=("$2")
            shift 2
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            head -25 "$0" | tail -n +2 | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            if [[ -z "$BACKUP_FILE" ]]; then
                BACKUP_FILE="$1"
            else
                echo "Unexpected argument: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate backup file
if [[ -z "$BACKUP_FILE" ]]; then
    echo "Error: Backup file is required"
    echo "Usage: $0 <backup_file> [options]"
    echo "Run '$0 --help' for more information"
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Determine file type
get_file_type() {
    if [[ "$BACKUP_FILE" == *.sql ]]; then
        echo "plain"
    else
        echo "custom"
    fi
}

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

    export DATABASE_URL=$(grep -E "^DATABASE_URL=" "$env_file" | cut -d '=' -f2-)

    if [[ -z "$DATABASE_URL" ]]; then
        echo "Error: DATABASE_URL not found in $env_file"
        exit 1
    fi
}

# List backup contents
list_backup() {
    echo "Contents of backup file:"
    echo ""
    pg_restore --list "$BACKUP_FILE" 2>/dev/null || {
        echo "(Cannot list contents - file may be plain SQL format)"
    }
}

# Perform the restore
do_restore() {
    local file_type=$(get_file_type)

    echo ""
    echo "Backup file: $BACKUP_FILE"
    echo "File type: $file_type"
    [[ "$CLEAN" == true ]] && echo "Mode: clean (drop existing objects)"
    [[ "$DATA_ONLY" == true ]] && echo "Mode: data only"
    [[ "$SCHEMA_ONLY" == true ]] && echo "Mode: schema only"
    [[ ${#TABLES[@]} -gt 0 ]] && echo "Tables: ${TABLES[*]}"
    echo ""

    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY RUN] Would restore from: $BACKUP_FILE"
        return
    fi

    # Confirmation prompt
    echo "⚠️  WARNING: This will modify your database!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Restore cancelled."
        exit 0
    fi

    echo ""
    echo "Starting restore..."

    if [[ "$file_type" == "plain" ]]; then
        # Plain SQL file - use psql
        if psql "$DATABASE_URL" -f "$BACKUP_FILE"; then
            echo ""
            echo "✅ Restore completed successfully!"
        else
            echo "❌ Restore failed!"
            exit 1
        fi
    else
        # Custom format - use pg_restore
        local pg_restore_args=()

        pg_restore_args+=("-d" "$DATABASE_URL")

        if [[ "$CLEAN" == true ]]; then
            pg_restore_args+=("--clean" "--if-exists")
        fi

        if [[ "$DATA_ONLY" == true ]]; then
            pg_restore_args+=("--data-only")
        elif [[ "$SCHEMA_ONLY" == true ]]; then
            pg_restore_args+=("--schema-only")
        fi

        for table in "${TABLES[@]}"; do
            pg_restore_args+=("-t" "$table")
        done

        pg_restore_args+=("$BACKUP_FILE")

        if pg_restore "${pg_restore_args[@]}" 2>&1; then
            echo ""
            echo "✅ Restore completed successfully!"
        else
            # pg_restore returns non-zero even on warnings
            echo ""
            echo "⚠️  Restore completed with warnings (this is often normal)"
        fi
    fi
}

# Main
main() {
    echo "==================================="
    echo "  Database Restore (pg_restore)"
    echo "==================================="
    echo ""

    load_env

    if [[ "$LIST_ONLY" == true ]]; then
        list_backup
    else
        do_restore
    fi

    echo ""
    echo "Done!"
}

main
