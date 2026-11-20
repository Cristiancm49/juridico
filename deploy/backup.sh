#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_NAME="ConsultorioContable-${STAMP}.bak"

mkdir -p backups
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  /bin/bash -lc "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"\$MSSQL_SA_PASSWORD\" -C -Q \"BACKUP DATABASE [ConsultorioContable] TO DISK = N'/var/opt/mssql/backups/$BACKUP_NAME' WITH INIT, COMPRESSION, CHECKSUM\""
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" cp \
  "db:/var/opt/mssql/backups/$BACKUP_NAME" "backups/$BACKUP_NAME"

echo "Backup creado en backups/$BACKUP_NAME"

