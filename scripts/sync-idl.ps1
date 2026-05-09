$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$idlSource = Join-Path $repoRoot "target\idl\voicedesk.json"
$idlTarget = Join-Path $repoRoot "app\lib\idl\voicedesk.json"

if (-not (Test-Path $idlSource)) {
  throw "Generated IDL not found at $idlSource. Run anchor build first."
}

Copy-Item -LiteralPath $idlSource -Destination $idlTarget -Force
Write-Host "Synced $idlSource -> $idlTarget"
