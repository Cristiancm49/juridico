#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Uso:
  ./deploy/restore.sh RUTA_RESPALDO BASE_DESTINO BUCKET_DESTINO --confirm [--overwrite]

Primero restaure en nombres temporales. --overwrite elimina y reemplaza los destinos
indicados; detenga backend y alerts antes de usarlo sobre el ambiente real.
EOF
}

if [[ $# -lt 4 || $# -gt 5 ]]; then
  usage >&2
  exit 2
fi

backup_dir="$(realpath "$1")"
restore_database="$2"
restore_bucket="$3"
confirmation="$4"
overwrite="${5:-}"

if [[ "$confirmation" != "--confirm" || ( -n "$overwrite" && "$overwrite" != "--overwrite" ) ]]; then
  usage >&2
  exit 2
fi

if [[ ! "$restore_database" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Nombre de base de datos no válido: $restore_database" >&2
  exit 2
fi

if [[ ! "$restore_bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "Nombre de bucket no válido: $restore_bucket" >&2
  exit 2
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$project_root/docker-compose.prod.yml"
env_file="$project_root/deploy/legaldesk.env"
dump_file="$backup_dir/postgres.dump"
objects_dir="$backup_dir/objects"
manifest_file="$backup_dir/manifest.json"
stamp="$(date -u +%Y%m%d-%H%M%S)"
container_dump="/tmp/legaldesk-restore-$stamp.dump"
container_objects="/tmp/legaldesk-restore-$stamp"
compose=(docker compose --env-file "$env_file" -f "$compose_file")

for required_file in "$env_file" "$dump_file" "$manifest_file"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Falta $required_file" >&2
    exit 1
  fi
done

if [[ ! -d "$objects_dir" ]]; then
  echo "Falta $objects_dir" >&2
  exit 1
fi

cleanup() {
  "${compose[@]}" exec -T postgres rm -f "$container_dump" >/dev/null 2>&1 || true
  "${compose[@]}" exec -T storage rm -rf "$container_objects" >/dev/null 2>&1 || true
}
trap cleanup EXIT

expected_hash="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["postgresSha256"])' "$manifest_file")"
expected_objects="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["objectCount"])' "$manifest_file")"
actual_hash="$(sha256sum "$dump_file" | awk '{print $1}')"

if [[ "$actual_hash" != "$expected_hash" ]]; then
  echo "El SHA-256 del respaldo de PostgreSQL no coincide con el manifiesto." >&2
  exit 1
fi

database_exists="$("${compose[@]}" exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '\''$1'\''"' \
  -- "$restore_database" | tr -d '[:space:]')"

if [[ "$database_exists" == "1" && "$overwrite" != "--overwrite" ]]; then
  echo "La base $restore_database ya existe. Repita con --overwrite solo si desea reemplazarla." >&2
  exit 1
fi

"${compose[@]}" exec -T storage sh -c '
  mc alias set legaldesk-restore http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
'

if "${compose[@]}" exec -T storage mc stat "legaldesk-restore/$restore_bucket" >/dev/null 2>&1; then
  if [[ "$overwrite" != "--overwrite" ]]; then
    echo "El bucket $restore_bucket ya existe. Repita con --overwrite solo si desea reemplazarlo." >&2
    exit 1
  fi
  bucket_exists=true
else
  bucket_exists=false
fi

"${compose[@]}" cp "$dump_file" "postgres:$container_dump"

if [[ "$database_exists" == "1" ]]; then
  "${compose[@]}" exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --force "$1"' -- "$restore_database"
fi

"${compose[@]}" exec -T postgres sh -c '
  createdb -U "$POSTGRES_USER" "$1"
  pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-privileges "$2"
' -- "$restore_database" "$container_dump"

if [[ "$bucket_exists" == "true" ]]; then
  "${compose[@]}" exec -T storage mc rb --force "legaldesk-restore/$restore_bucket" >/dev/null
fi

"${compose[@]}" exec -T storage mc mb "legaldesk-restore/$restore_bucket" >/dev/null

if [[ "$expected_objects" -gt 0 ]]; then
  "${compose[@]}" exec -T storage mkdir -p "$container_objects"
  "${compose[@]}" cp "$objects_dir/." "storage:$container_objects"
  "${compose[@]}" exec -T storage mc mirror --overwrite "$container_objects" "legaldesk-restore/$restore_bucket" >/dev/null
fi

restored_objects="$("${compose[@]}" exec -T storage sh -c \
  'mc find "legaldesk-restore/$1" --print "{}" | wc -l | tr -d " "' \
  -- "$restore_bucket")"

if [[ "$restored_objects" != "$expected_objects" ]]; then
  echo "Cantidad de objetos inesperada: se esperaban $expected_objects y se restauraron $restored_objects." >&2
  exit 1
fi

echo "Restauración comprobada."
echo "Base de datos: $restore_database"
echo "Bucket: $restore_bucket"
echo "Objetos: $restored_objects"
