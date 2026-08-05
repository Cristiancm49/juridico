[CmdletBinding()]
param(
  [string]$BackupRoot = "backups",
  [string]$PostgresContainer = "legaldesk-postgres",
  [string]$MinioContainer = "legaldesk-minio",
  [string]$Database = "legaldesk",
  [string]$DatabaseUser = "legaldesk",
  [string]$Bucket = "legaldesk-documents",
  [string]$S3AccessKey = "legaldesk",
  [string]$S3SecretKey = "legaldesk-local-secret"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$rootPath = if ([IO.Path]::IsPathRooted($BackupRoot)) { [IO.Path]::GetFullPath($BackupRoot) } else { [IO.Path]::GetFullPath((Join-Path $repoRoot $BackupRoot)) }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $rootPath "legaldesk-$stamp"
$objectsPath = Join-Path $backupPath "objects"
$dumpPath = Join-Path $backupPath "postgres.dump"
$containerDump = "/tmp/legaldesk-backup-$stamp.dump"
$containerObjects = "/tmp/legaldesk-backup-$stamp"

function Assert-LastCommand([string]$message) {
  if ($LASTEXITCODE -ne 0) { throw $message }
}

New-Item -ItemType Directory -Path $objectsPath -Force | Out-Null

try {
  & docker exec $PostgresContainer pg_dump -U $DatabaseUser -d $Database -Fc -f $containerDump
  Assert-LastCommand "No fue posible generar el respaldo de PostgreSQL."
  & docker cp "${PostgresContainer}:$containerDump" $dumpPath
  Assert-LastCommand "No fue posible copiar el respaldo de PostgreSQL."

  & docker exec $MinioContainer mkdir -p $containerObjects
  Assert-LastCommand "No fue posible preparar el respaldo de objetos."
  & docker exec $MinioContainer mc alias set legaldesk-backup http://127.0.0.1:9000 $S3AccessKey $S3SecretKey | Out-Null
  Assert-LastCommand "No fue posible autenticar el cliente de objetos."
  & docker exec $MinioContainer mc mirror --overwrite "legaldesk-backup/$Bucket" $containerObjects | Out-Null
  Assert-LastCommand "No fue posible respaldar el bucket $Bucket."
  & docker cp "${MinioContainer}:$containerObjects/." $objectsPath
  Assert-LastCommand "No fue posible copiar el respaldo de objetos."

  $manifest = [ordered]@{
    formatVersion = 1
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    database = $Database
    bucket = $Bucket
    postgresSha256 = (Get-FileHash -Algorithm SHA256 $dumpPath).Hash.ToLowerInvariant()
    objectCount = @(Get-ChildItem -LiteralPath $objectsPath -Recurse -File).Count
  }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupPath "manifest.json") -Encoding utf8
  Write-Host "Respaldo completado: $backupPath"
  Write-Host "Objetos incluidos: $($manifest.objectCount)"
} finally {
  & docker exec $PostgresContainer rm -f $containerDump 2>$null
  & docker exec $MinioContainer rm -rf $containerObjects 2>$null
}
