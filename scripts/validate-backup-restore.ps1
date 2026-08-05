[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$safeTmpRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "tmp"))
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$testRoot = [IO.Path]::GetFullPath((Join-Path $safeTmpRoot "backup-restore-$stamp"))
$restoreDatabase = "legaldesk_restore_$stamp"
$restoreBucket = "legaldesk-restore-$stamp"
$objectKey = "_verification/backup-$stamp.txt"

if (-not $testRoot.StartsWith($safeTmpRoot)) { throw "La ruta temporal salió del workspace." }
if (Test-Path -LiteralPath $testRoot) { throw "La ruta temporal ya existe." }

try {
  & docker exec legaldesk-minio mc alias set legaldesk-verify http://127.0.0.1:9000 legaldesk legaldesk-local-secret | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "No fue posible autenticar MinIO." }
  "LegalDesk backup verification" | & docker exec -i legaldesk-minio mc pipe "legaldesk-verify/legaldesk-documents/$objectKey" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "No fue posible crear el objeto temporal." }

  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup.ps1") -BackupRoot $testRoot
  if ($LASTEXITCODE -ne 0) { throw "Falló el respaldo de validación." }
  $backupDir = (Get-ChildItem -LiteralPath $testRoot -Directory | Select-Object -First 1).FullName
  $manifest = Get-Content -LiteralPath (Join-Path $backupDir "manifest.json") -Raw | ConvertFrom-Json
  if ([int]$manifest.objectCount -lt 1) { throw "El respaldo no incluyó el objeto temporal." }

  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "restore.ps1") -BackupDir $backupDir -RestoreDatabase $restoreDatabase -RestoreBucket $restoreBucket -ConfirmRestore
  if ($LASTEXITCODE -ne 0) { throw "Falló la restauración de validación." }
  $restored = & docker exec legaldesk-minio mc cat "legaldesk-verify/$restoreBucket/$objectKey"
  if ("$restored" -notmatch "LegalDesk backup verification") { throw "El objeto restaurado no coincide." }

  Write-Host "Respaldo y restauración verificados con $($manifest.objectCount) objeto(s)."
} finally {
  & docker exec legaldesk-minio mc rm --force "legaldesk-verify/legaldesk-documents/$objectKey" 2>$null
  & docker exec legaldesk-postgres dropdb -U legaldesk --force $restoreDatabase 2>$null
  & docker exec legaldesk-minio mc rb --force "legaldesk-verify/$restoreBucket" 2>$null
  if ((Test-Path -LiteralPath $testRoot) -and $testRoot.StartsWith($safeTmpRoot)) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}
