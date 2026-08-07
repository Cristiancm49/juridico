#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$project_root/docker-compose.prod.yml"
env_file="$project_root/deploy/legaldesk.env"
backup_root="${BACKUP_ROOT:-$project_root/backups}"
stamp="$(date -u +%Y%m%d-%H%M%S)"
backup_dir="$backup_root/legaldesk-$stamp"
objects_dir="$backup_dir/objects"
dump_file="$backup_dir/postgres.dump"
container_dump="/tmp/legaldesk-backup-$stamp.dump"
container_objects="/tmp/legaldesk-backup-$stamp"

compose=(docker compose --env-file "$env_file" -f "$compose_file")

cleanup() {
  "${compose[@]}" exec -T postgres rm -f "$container_dump" >/dev/null 2>&1 || true
  "${compose[@]}" exec -T storage rm -rf "$container_objects" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [[ ! -f "$env_file" ]]; then
  echo "Falta $env_file" >&2
  exit 1
fi

umask 077
mkdir -p "$objects_dir"

"${compose[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' -- "$container_dump"
"${compose[@]}" cp "postgres:$container_dump" "$dump_file"

"${compose[@]}" exec -T storage sh -c '
  rm -rf "$1" && mkdir -p "$1"
  mc alias set legaldesk-backup http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
  mc mirror --overwrite "legaldesk-backup/$S3_BUCKET" "$1" >/dev/null
' -- "$container_objects"
"${compose[@]}" cp "storage:$container_objects/." "$objects_dir"

dump_hash="$(sha256sum "$dump_file" | awk '{print $1}')"
object_count="$(find "$objects_dir" -type f | wc -l | tr -d ' ')"
cat > "$backup_dir/manifest.json" <<EOF
{
  "formatVersion": 1,
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "postgresSha256": "$dump_hash",
  "objectCount": $object_count
}
EOF

echo "Respaldo completado: $backup_dir"
echo "Objetos incluidos: $object_count"
