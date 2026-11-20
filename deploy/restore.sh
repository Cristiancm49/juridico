#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: RESTORE_CONFIRM=YES ./deploy/restore.sh backups/archivo.bak" >&2
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "YES" ]; then
  echo "La restauracion reemplaza la base actual. Ejecuta con RESTORE_CONFIRM=YES." >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_PATH="$1"
BACKUP_NAME="$(basename "$BACKUP_PATH")"

case "$BACKUP_NAME" in
  *[!A-Za-z0-9._-]*)
    echo "El nombre del respaldo contiene caracteres no permitidos." >&2
    exit 1
    ;;
esac

if [ ! -f "$BACKUP_PATH" ]; then
  echo "No existe el respaldo: $BACKUP_PATH" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" cp \
  "$BACKUP_PATH" "db:/var/opt/mssql/backups/$BACKUP_NAME"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop api

restart_api() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start api >/dev/null 2>&1 || true
}
trap restart_api EXIT

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  /bin/bash -lc "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"\$MSSQL_SA_PASSWORD\" -C -Q \"ALTER DATABASE [ConsultorioContable] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [ConsultorioContable] FROM DISK = N'/var/opt/mssql/backups/$BACKUP_NAME' WITH REPLACE, CHECKSUM; ALTER DATABASE [ConsultorioContable] SET MULTI_USER;\""

trap - EXIT
restart_api
echo "Base de datos restaurada desde $BACKUP_PATH"

