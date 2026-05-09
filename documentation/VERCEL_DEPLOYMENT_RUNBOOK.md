# Vercel Deployment Runbook

This project is a monorepo. Deploy only the Next.js frontend in `app/` to Vercel.
The FastAPI bridge is a separate service and should be deployed to Railway or a
similar container host.

For the service map and sequence diagrams, see
`documentation/architecture/DIAGRAMS.md`.

For the FastAPI bridge deployment, see
`documentation/RAILWAY_BRIDGE_RUNBOOK.md`.

For the Anchor program deployment required by `/business/new`, see
`documentation/SOLANA_DEVNET_DEPLOYMENT_RUNBOOK.md`.

## Current State

- Frontend path: `app/`
- Framework: Next.js 14
- Vercel project is already linked locally under `app/.vercel/`, but that folder
  is gitignored and should not be committed.
- Production build could not be verified in this session because the existing
  `app/node_modules` does not contain local binaries such as `next` or `tsc`.
  Run `npm install` or `pnpm install` yourself before local verification.
- `/book` is intentionally not part of the deployed MVP until a real ElevenLabs
  Conversational AI widget is wired. The customer-facing payment route remains
  `/pay/[bookingId]`.

## Vercel Project Settings

When importing the GitHub repo into Vercel, set:

```text
Root Directory: app
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

If you deploy from the CLI instead, run it from the frontend directory:

```bash
cd app
vercel
vercel --prod
```

Vercel's CLI prints the deployment URL to stdout after a successful deployment.

## Required Frontend Environment Variables

Set these in Vercel Project Settings -> Environment Variables for Production,
Preview, and Development as needed:

```text
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=41HHr5soWR3ScMDKZWPDiaN63KXaqkiAaauzE9MjUtWT
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_API_URL=https://your-railway-bridge.example.com
```

The same frontend-only template is committed at `app/.env.example`.

Only `NEXT_PUBLIC_*` values are bundled into the browser. Do not put API keys in
the Vercel frontend project unless they are needed by server-only Next routes.

## Required Bridge Environment Variables

Set these on Railway or the bridge host:

```text
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
ANCHOR_PROGRAM_ID=41HHr5soWR3ScMDKZWPDiaN63KXaqkiAaauzE9MjUtWT
ANCHOR_WALLET=./keys/bridge-wallet.json
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
PUBLIC_API_URL=https://your-railway-bridge.example.com
FRONTEND_URL=https://your-vercel-app.vercel.app
ELEVENLABS_WEBHOOK_SECRET=<if configured>
```

`FRONTEND_URL` is important: the bridge uses it to return `/pay/[bookingId]`
links to the voice agent.

## Local Verification Before Deploy

Run these after you install dependencies yourself:

```bash
cd app
npm run typecheck
npm run build
npm run dev
```

Expected smoke test:

```text
/              loads the VoiceDesk landing page
/dashboard     asks for Phantom wallet
/business/new  asks for Phantom wallet
/pay/<id>      attempts to load an on-chain booking by 64-char booking id
```

## Post-Deploy Smoke Test

1. Open the Vercel URL.
2. Visit `/dashboard` and connect Phantom on devnet.
3. Create a business from `/business/new`.
4. Confirm the transaction appears on Solana Explorer devnet.
5. Create a booking intent through the bridge or ElevenLabs tool call.
6. Confirm the returned payment URL points to the Vercel frontend:

```text
https://your-vercel-app.vercel.app/pay/<64-hex-booking-id>
```

## Known Iteration Items

- Add the real ElevenLabs Conversational AI browser widget before restoring a
  public `/book` route.
- Add a deterministic demo booking flow so judges can create a booking without
  manually calling the bridge.
- Verify `npm run build` after dependencies are installed.
- Deploy the bridge separately and point `NEXT_PUBLIC_API_URL` and
  `FRONTEND_URL` at the real deployment URLs.
