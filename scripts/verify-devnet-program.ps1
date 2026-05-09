param(
  [string]$ProgramId = "41HHr5soWR3ScMDKZWPDiaN63KXaqkiAaauzE9MjUtWT"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
  throw "Required command 'solana' was not found in PATH."
}

Write-Host "Checking program on devnet: $ProgramId"
$account = solana account $ProgramId --url devnet 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Host $account
  throw "Program account was not found on devnet."
}

$account | Write-Host

if ($account -match "Executable:\s+true") {
  Write-Host ""
  Write-Host "OK: program exists and is executable on devnet."
  exit 0
}

throw "Program account exists but is not executable."
