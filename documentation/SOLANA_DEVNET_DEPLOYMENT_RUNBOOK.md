# Solana Devnet Deployment Runbook

The Vercel frontend can deploy without the Anchor program, but on-chain actions
such as `/business/new` require the VoiceDesk program to exist on the selected
Solana cluster.

If the UI shows:

```text
Attempt to load a program that does not exist
```

then `NEXT_PUBLIC_PROGRAM_ID` points to a program address that is not deployed
on the current cluster.

## Deploy The Anchor Program

Run from the repo root after installing the Solana and Anchor toolchains.

On Windows PowerShell:

```powershell
.\scripts\deploy-devnet.ps1
```

For a first-time Windows machine, let the script create a repo-local devnet
deployer wallet at `.solana/devnet-deployer.json`:

```powershell
.\scripts\deploy-devnet.ps1 -CreateWallet
```

Or through npm:

```bash
npm run deploy:devnet:ps
```

First-time bootstrap through npm:

```bash
npm run deploy:devnet:bootstrap:ps
```

Manual equivalent:

```bash
solana config set --url devnet
solana-keygen pubkey ~/.config/solana/id.json
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
```

The `.solana/` directory is gitignored. Do not commit deployer wallets.

On Windows, `anchor build` may need Developer Mode enabled or an elevated
PowerShell session the first time it installs SBF platform tools. If the build
fails with:

```text
A required privilege is not held by the client. (os error 1314)
```

enable Windows Developer Mode, or rerun the deploy command from PowerShell as
Administrator.

After deploy, get the deployed program ID:

```bash
solana address -k target/deploy/voicedesk-keypair.json
```

## Sync Program ID

The program ID must match in all three places:

```text
programs/voicedesk/src/lib.rs
Anchor.toml
app/lib/idl/voicedesk.json
```

If `solana address -k target/deploy/voicedesk-keypair.json` prints a different
address from `declare_id!`, update `declare_id!` and `Anchor.toml`, then rebuild
and deploy again:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

Then copy the generated IDL to the frontend:

```bash
cp target/idl/voicedesk.json app/lib/idl/voicedesk.json
```

Commit and push the updated IDL and program ID.

## Update Hosted Services

In Vercel, set:

```text
NEXT_PUBLIC_PROGRAM_ID=<deployed-devnet-program-id>
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

In Railway, set:

```text
ANCHOR_PROGRAM_ID=<deployed-devnet-program-id>
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Redeploy both Vercel and Railway.

## Verify

From PowerShell:

```powershell
.\scripts\verify-devnet-program.ps1 -ProgramId <deployed-devnet-program-id>
```

Then open:

```text
https://explorer.solana.com/address/<deployed-devnet-program-id>?cluster=devnet
```

The account must exist and be marked executable.
