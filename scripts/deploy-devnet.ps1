param(
  [switch]$CreateWallet,
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
Require-Command "solana-keygen"
Require-Command "anchor"

function Invoke-NativeCommand($Command, [string[]]$Arguments, $FailureMessage) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function ConvertTo-AbsolutePath($Path) {
  if ($Path.StartsWith("~/") -or $Path.StartsWith("~\")) {
    return Join-Path $HOME $Path.Substring(2)
  }

  return $Path
}

function Test-LeafPath($Path) {
  try {
    return Test-Path -LiteralPath $Path -PathType Leaf
  }
  catch {
    throw "Cannot access $Path. Check the file permissions or run PowerShell as the Windows user that owns the Solana config."
  }
}

function Test-Keypair($Path) {
  if (-not (Test-LeafPath $Path)) {
    return $false
  }

  $pubkey = solana-keygen pubkey $Path 2>$null
  return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($pubkey))
}

function New-SolanaKeypair($Path) {
  $walletDirectory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $walletDirectory -PathType Container)) {
    New-Item -Path $walletDirectory -ItemType Directory -Force | Out-Null
  }

  if (Test-LeafPath $Path) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "$Path.invalid-$timestamp.bak"
    Write-Host "Existing Solana signer at $Path is unusable. Moving it to $backupPath..."
    Move-Item -LiteralPath $Path -Destination $backupPath -Force
  }

  Invoke-NativeCommand "solana-keygen" @("new", "-o", $Path, "--no-bip39-passphrase") "Failed to create Solana keypair at $Path."
}

function Get-DeclaredProgramId {
  $programFile = Join-Path $repoRoot "programs\voicedesk\src\lib.rs"
  $content = Get-Content -LiteralPath $programFile -Raw
  if ($content -match 'declare_id!\("([^"]+)"\)') {
    return $Matches[1]
  }

  throw "Could not find declare_id! in $programFile."
}

function Sync-ProgramId($ProgramId) {
  $programFile = Join-Path $repoRoot "programs\voicedesk\src\lib.rs"
  $anchorFile = Join-Path $repoRoot "Anchor.toml"

  $programContent = Get-Content -LiteralPath $programFile -Raw
  $programContent = $programContent -replace 'declare_id!\("[^"]+"\)', "declare_id!(`"$ProgramId`")"
  [System.IO.File]::WriteAllText($programFile, $programContent, [System.Text.UTF8Encoding]::new($false))

  $anchorContent = Get-Content -LiteralPath $anchorFile -Raw
  $anchorContent = $anchorContent -replace '(?m)^(voicedesk\s*=\s*)"[^"]+"', "`${1}`"$ProgramId`""
  [System.IO.File]::WriteAllText($anchorFile, $anchorContent, [System.Text.UTF8Encoding]::new($false))
}

Write-Host "Setting Solana cluster to devnet..."
Invoke-NativeCommand "solana" @("config", "set", "--url", "devnet") "Failed to set Solana cluster to devnet."

$walletPath = Join-Path $repoRoot ".solana\devnet-deployer.json"
Write-Host "Using repo-local devnet deployer wallet: $walletPath"
Invoke-NativeCommand "solana" @("config", "set", "--keypair", $walletPath) "Failed to set Solana keypair to $walletPath."

Write-Host "Active Solana config:"
$solanaConfig = solana config get
if ($LASTEXITCODE -ne 0) {
  throw "Failed to read Solana config."
}
$solanaConfig | Write-Host

$keypairLine = $solanaConfig | Where-Object { $_ -match "^Keypair Path:\s*(.+)$" } | Select-Object -First 1
if (-not $keypairLine) {
  throw "Solana config does not include a Keypair Path. Run: solana config set --keypair `"$HOME\.config\solana\id.json`""
}

$walletPath = ConvertTo-AbsolutePath (($keypairLine -replace "^Keypair Path:\s*", "").Trim())
if (-not (Test-Keypair $walletPath)) {
  if (-not $CreateWallet) {
    throw "Solana default signer is missing or unusable at $walletPath. Rerun with -CreateWallet to create it, or create one manually with: solana-keygen new -o `"$walletPath`"."
  }

  Write-Host "Creating Solana default signer at $walletPath..."
  New-SolanaKeypair $walletPath
}

$walletPubkey = (solana-keygen pubkey $walletPath).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($walletPubkey)) {
  throw "Failed to read deployer wallet pubkey from $walletPath."
}
Write-Host "Deployer wallet pubkey: $walletPubkey"

if (-not $SkipAirdrop) {
  Write-Host "Requesting 2 devnet SOL for the configured wallet..."
  Invoke-NativeCommand "solana" @("airdrop", "2", $walletPubkey, "--url", "devnet") "Devnet airdrop failed. Check devnet faucet availability, or rerun with -SkipAirdrop if the wallet already has SOL."
}

Write-Host "Building Anchor program..."
anchor build
if ($LASTEXITCODE -ne 0) {
  throw "Anchor build failed. On Windows, if the error mentions 'A required privilege is not held by the client' while installing platform-tools, enable Windows Developer Mode or rerun PowerShell as Administrator, then run this script again."
}

$programKeypair = Join-Path $repoRoot "target\deploy\voicedesk-keypair.json"
if (-not (Test-Path $programKeypair)) {
  throw "Program keypair not found at $programKeypair. Anchor build did not produce it."
}

$programId = (solana address -k $programKeypair).Trim()
Write-Host "Program keypair address: $programId"

$declaredProgramId = Get-DeclaredProgramId
if ($declaredProgramId -ne $programId) {
  Write-Host "Syncing declared program ID from $declaredProgramId to $programId..."
  Sync-ProgramId $programId

  Write-Host "Rebuilding Anchor program after program ID sync..."
  anchor build
  if ($LASTEXITCODE -ne 0) {
    throw "Anchor rebuild failed after syncing the program ID."
  }
}

Write-Host "Deploying Anchor program to devnet..."
anchor deploy --provider.cluster devnet --provider.wallet $walletPath
if ($LASTEXITCODE -ne 0) {
  throw "Anchor deploy failed."
}

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
