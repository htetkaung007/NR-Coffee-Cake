#!/usr/bin/env bash
# NR Cafe — back up the database and uploaded images to BACKUP_DIR.
# Installed as root-owned /usr/local/sbin/nr-cafe-backup (see deploy/README).
# Edit this file in the repo, then re-install it.
set -euo pipefail

BACKUP_DIR=/var/backups/nr-cafe
UPLOAD_DIR=/var/lib/cafe-maw/uploads
DB_CONTAINER=cafe-maw-db
KEEP_DAYS=90
STAMP="$(date +%F_%H%M)"

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "== 1/3 Database"
docker exec "$DB_CONTAINER" \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$BACKUP_DIR/db_$STAMP.dump.part"
mv "$BACKUP_DIR/db_$STAMP.dump.part" "$BACKUP_DIR/db_$STAMP.dump"

echo "== 2/3 Images"
tar -czf "$BACKUP_DIR/uploads_$STAMP.tar.gz.part" -C "$UPLOAD_DIR" .
mv "$BACKUP_DIR/uploads_$STAMP.tar.gz.part" "$BACKUP_DIR/uploads_$STAMP.tar.gz"

echo "== 3/3 Remove backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -type f -name '*.part' -mmin +60 -print -delete

echo "== Done:"
ls -lh "$BACKUP_DIR" | tail -n 4
