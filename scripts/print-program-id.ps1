$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$programKeypair = Join-Path $repoRoot "target\deploy\voicedesk-keypair.json"

if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
  throw "Required command 'solana' was not found in PATH."
}

if (-not (Test-Path $programKeypair)) {
  throw "Program keypair not found at $programKeypair. Run anchor build first."
}

solana address -k $programKeypair
