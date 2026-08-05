[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$BackupDir,
  [Parameter(Mandatory = $true)][string]$RestoreDatabase,
  [Parameter(Mandatory = $true)][string]$RestoreBucket,
  [switch]$ConfirmRestore,
  [switch]$Overwrite,
  [string]$PostgresContainer = "legaldesk-postgres",
  [string]$MinioContainer = "legaldesk-minio",
  [string]$DatabaseUser = "legaldesk",
  [string]$S3AccessKey = "legaldesk",
  [string]$S3SecretKey = "legaldesk-local-secret"
)

$ErrorActionPreference = "Stop"
if (-not $ConfirmRestore) { throw "La restauración modifica datos. Vuelve a ejecutar con -ConfirmRestore." }
if ($RestoreDatabase -notmatch '^[A-Za-z][A-Za-z0-9_]{0,62}$') { throw "El nombre de la base de datos no es válido." }
if ($RestoreBucket -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$') { throw "El nombre del bucket no es válido." }

$resolvedBackup = (Resolve-Path -LiteralPath $BackupDir).Path
$dumpPath = Join-Path $resolvedBackup "postgres.dump"
$objectsPath = Join-Path $resolvedBackup "objects"
$manifestPath = Join-Path $resolvedBackup "manifest.json"
if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) { throw "Falta postgres.dump en el respaldo." }
if (-not (Test-Path -LiteralPath $objectsPath -PathType Container)) { throw "Falta la carpeta objects en el respaldo." }
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Falta manifest.json en el respaldo." }

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$actualHash = (Get-FileHash -Algorithm SHA256 $dumpPath).Hash.ToLowerInvariant()
if ($actualHash -ne $manifest.postgresSha256) { throw "El archivo PostgreSQL no coincide con el hash del manifiesto." }

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$containerDump = "/tmp/legaldesk-restore-$stamp.dump"
$containerObjects = "/tmp/legaldesk-restore-$stamp"

function Assert-LastCommand([string]$message) {
  if ($LASTEXITCODE -ne 0) { throw $message }
}

try {
  $databaseOutput = & docker exec $PostgresContainer psql -U $DatabaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$RestoreDatabase'"
  Assert-LastCommand "No fue posible consultar PostgreSQL."
  $databaseExists = "$databaseOutput".Trim() -eq "1"
  if ($databaseExists -and -not $Overwrite) { throw "La base $RestoreDatabase ya existe. Usa -Overwrite para reemplazarla." }
  if ($databaseExists) {
    & docker exec $PostgresContainer dropdb -U $DatabaseUser --force $RestoreDatabase
    Assert-LastCommand "No fue posible reemplazar la base $RestoreDatabase."
  }
  & docker exec $PostgresContainer createdb -U $DatabaseUser $RestoreDatabase
  Assert-LastCommand "No fue posible crear la base $RestoreDatabase."
  & docker cp $dumpPath "${PostgresContainer}:$containerDump"
  Assert-LastCommand "No fue posible copiar el respaldo hacia PostgreSQL."
  & docker exec $PostgresContainer pg_restore -U $DatabaseUser -d $RestoreDatabase --no-owner --no-privileges $containerDump
  Assert-LastCommand "No fue posible restaurar PostgreSQL."

  & docker exec $MinioContainer mc alias set legaldesk-restore http://127.0.0.1:9000 $S3AccessKey $S3SecretKey | Out-Null
  Assert-LastCommand "No fue posible autenticar el cliente de objetos."
  $bucketListing = & docker exec $MinioContainer mc ls legaldesk-restore
  Assert-LastCommand "No fue posible consultar los buckets existentes."
  $bucketExists = "$bucketListing" -match [regex]::Escape("$RestoreBucket/")
  if ($bucketExists -and -not $Overwrite) { throw "El bucket $RestoreBucket ya existe. Usa -Overwrite para reemplazarlo." }
  if ($bucketExists) {
    & docker exec $MinioContainer mc rb --force "legaldesk-restore/$RestoreBucket" | Out-Null
    Assert-LastCommand "No fue posible reemplazar el bucket $RestoreBucket."
  }
  & docker exec $MinioContainer mc mb "legaldesk-restore/$RestoreBucket" | Out-Null
  Assert-LastCommand "No fue posible crear el bucket $RestoreBucket."

  $objectFiles = @(Get-ChildItem -LiteralPath $objectsPath -Recurse -File)
  if ($objectFiles.Count -gt 0) {
    & docker exec $MinioContainer mkdir -p $containerObjects
    Assert-LastCommand "No fue posible preparar los objetos para restauración."
    & docker cp "$objectsPath/." "${MinioContainer}:$containerObjects"
    Assert-LastCommand "No fue posible copiar los objetos para restauración."
    & docker exec $MinioContainer mc mirror --overwrite $containerObjects "legaldesk-restore/$RestoreBucket" | Out-Null
    Assert-LastCommand "No fue posible restaurar los objetos."
  }

  $migrationCount = (& docker exec $PostgresContainer psql -U $DatabaseUser -d $RestoreDatabase -tAc "SELECT COUNT(*) FROM schema_migrations").Trim()
  Assert-LastCommand "La base restaurada no superó la comprobación de migraciones."
  $restoredObjects = (& docker exec $MinioContainer mc find "legaldesk-restore/$RestoreBucket" --print "{}" | Measure-Object).Count
  Assert-LastCommand "No fue posible comprobar los objetos restaurados."
  if ($restoredObjects -ne [int]$manifest.objectCount) { throw "Se esperaban $($manifest.objectCount) objetos y se restauraron $restoredObjects." }

  Write-Host "Restauración validada en base '$RestoreDatabase' y bucket '$RestoreBucket'."
  Write-Host "Migraciones: $migrationCount. Objetos: $restoredObjects."
} finally {
  & docker exec $PostgresContainer rm -f $containerDump 2>$null
  & docker exec $MinioContainer rm -rf $containerObjects 2>$null
}
