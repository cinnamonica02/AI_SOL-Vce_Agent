param(
  [switch]$SkipAirdrop
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

Require-Command "solana"
Require-Command "anchor"

Write-Host "Setting Solana cluster to devnet..."
solana config set --url devnet | Write-Host

Write-Host "Active Solana config:"
solana config get | Write-Host

if (-not $SkipAirdrop) {
  Write-Host "Requesting 2 devnet SOL for the configured wallet..."
  solana airdrop 2 | Write-Host
}

Write-Host "Building Anchor program..."
anchor build

$programKeypair = Join-Path $repoRoot "target\deploy\voicedesk-keypair.json"
if (-not (Test-Path $programKeypair)) {
  throw "Program keypair not found at $programKeypair. Anchor build did not produce it."
}

$programId = (solana address -k $programKeypair).Trim()
Write-Host "Program keypair address: $programId"

Write-Host "Deploying Anchor program to devnet..."
anchor deploy --provider.cluster devnet

$idlSource = Join-Path $repoRoot "target\idl\voicedesk.json"
$idlTarget = Join-Path $repoRoot "app\lib\idl\voicedesk.json"
if (-not (Test-Path $idlSource)) {
  throw "Generated IDL not found at $idlSource."
}

Write-Host "Syncing IDL to frontend..."
Copy-Item -LiteralPath $idlSource -Destination $idlTarget -Force

Write-Host ""
Write-Host "Devnet deploy complete."
Write-Host "Program ID: $programId"
Write-Host ""
Write-Host "Make sure these values match before redeploying Vercel/Railway:"
Write-Host "  programs/voicedesk/src/lib.rs declare_id!: $programId"
Write-Host "  Anchor.toml [programs.devnet].voicedesk: $programId"
Write-Host "  Vercel NEXT_PUBLIC_PROGRAM_ID: $programId"
Write-Host "  Railway ANCHOR_PROGRAM_ID: $programId"
Write-Host ""
Write-Host "Verify:"
Write-Host "  .\scripts\verify-devnet-program.ps1 -ProgramId $programId"
