# Railway Bridge Runbook

Deploy the FastAPI bridge separately from the Vercel frontend. The bridge
receives ElevenLabs tool calls, signs backend booking-intent transactions, and
returns customer payment links that point back to Vercel.

## What Railway Deploys

Use the repo root as the Railway project root so the Docker build can access:

```text
Dockerfile
ai_engine/
app/lib/idl/voicedesk.json
```

The Docker image sets:

```text
IDL_PATH=/app/idl/voicedesk.json
```

That means Railway does not need Anchor installed. It uses the committed IDL.

## Required Environment Variables

```text
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
ANCHOR_PROGRAM_ID=41HHr5soWR3ScMDKZWPDiaN63KXaqkiAaauzE9MjUtWT
ANCHOR_WALLET=/app/keys/bridge-wallet.json
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
PUBLIC_API_URL=https://your-railway-service.up.railway.app
FRONTEND_URL=https://your-vercel-app.vercel.app
API_LOG_LEVEL=info
```

`FRONTEND_URL` is required for returned payment links:

```text
https://your-vercel-app.vercel.app/pay/<booking_id>
```

`PUBLIC_API_URL` is the URL you configure in ElevenLabs as the tool webhook
base:

```text
https://your-railway-service.up.railway.app/webhook/elevenlabs
```

## Bridge Wallet

The current code expects a wallet keypair file at `ANCHOR_WALLET`. Do not commit
that file.

For a fast hackathon deployment, add the bridge keypair as a Railway mounted
file or secret volume at:

```text
/app/keys/bridge-wallet.json
```

The wallet must have devnet SOL to pay for `create_booking_intent` account
creation.

## Smoke Test

After Railway deploys, open:

```text
https://your-railway-service.up.railway.app/health
```

Expected:

```json
{
  "status": "ok",
  "service": "voicedesk-ai-engine",
  "version": "0.1.0",
  "solana": {
    "program_id": "41HHr5soWR3ScMDKZWPDiaN63KXaqkiAaauzE9MjUtWT",
    "idl_exists": true
  }
}
```

If `idl_exists` is false, Railway is not building from the repo root or the
Dockerfile did not copy `app/lib/idl/voicedesk.json`.

If the wallet file is missing, `/health` can still respond, but write tools will
fail when they try to load `ANCHOR_WALLET`.

## ElevenLabs Tool Endpoints

Configure ElevenLabs tools to POST to:

```text
https://your-railway-service.up.railway.app/webhook/elevenlabs
```

Supported tool names in the bridge:

```text
hello_world
check_availability
get_booking_status
create_booking_intent
```

Minimal `hello_world` payload:

```json
{
  "tool_name": "hello_world",
  "parameters": {}
}
```

Minimal `create_booking_intent` payload:

```json
{
  "tool_name": "create_booking_intent",
  "parameters": {
    "business_pubkey": "<business_pda>",
    "customer_pubkey": "<customer_wallet>",
    "deposit_amount": 50000000,
    "service_start": 1770000000,
    "service_end": 1770003600
  }
}
```

The response should include `payment_url`.

