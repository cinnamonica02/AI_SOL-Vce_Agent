# Architecture Diagrams

Mermaid diagrams for the deployable VoiceDesk MVP: Vercel frontend, FastAPI
bridge, Solana program, wallet signing, and the integrations still required for
the app to work end-to-end.

## MVP Deployment UML

```mermaid
flowchart LR
  subgraph user["Users"]
    smb["SMB operator<br/>Phantom wallet"]
    customer["Customer<br/>Phantom wallet for MVP"]
  end

  subgraph vercel["Vercel: Next.js app"]
    landing["/<br/>Landing"]
    dashboard["/dashboard<br/>SMB dashboard"]
    onboard["/business/new<br/>Create Business PDA"]
    pay["/pay/[bookingId]<br/>Lock customer deposit"]
    walletProvider["Solana wallet provider"]
    anchorClient["Anchor TS client<br/>app/lib/anchor-client.ts"]
  end

  subgraph railway["Railway or container host: FastAPI bridge"]
    apiRoot["GET /"]
    health["GET /health"]
    webhook["POST /webhook/elevenlabs"]
    dispatcher["Tool dispatcher<br/>main.py"]
    solanaPy["AnchorPy/Solana client<br/>solana_client.py"]
    bridgeWallet["Bridge keypair<br/>ANCHOR_WALLET"]
  end

  subgraph external["External integrations"]
    eleven["ElevenLabs Conversational AI<br/>tool webhooks"]
    rpc["Solana RPC<br/>devnet/mainnet"]
    explorer["Solana Explorer<br/>demo verification"]
  end

  subgraph chain["Solana"]
    program["VoiceDesk Anchor program<br/>41HHr5...UtWT"]
    businessPda["Business PDA"]
    bookingPda["Booking PDA"]
    escrowAta["Escrow token account<br/>USDC"]
  end

  smb --> landing
  smb --> dashboard
  smb --> onboard
  customer --> pay

  landing --> dashboard
  landing --> onboard
  dashboard --> walletProvider
  onboard --> walletProvider
  pay --> walletProvider
  walletProvider --> anchorClient
  anchorClient --> rpc
  rpc --> program

  eleven --> webhook
  webhook --> dispatcher
  dispatcher --> solanaPy
  solanaPy --> bridgeWallet
  solanaPy --> rpc

  program --> businessPda
  program --> bookingPda
  program --> escrowAta

  dashboard -. "tx links" .-> explorer
  pay -. "tx links" .-> explorer
```

## Booking And Deposit Sequence

```mermaid
sequenceDiagram
  autonumber
  actor C as Customer
  participant EL as ElevenLabs Agent
  participant API as FastAPI Bridge
  participant SOL as Solana Program
  participant WEB as Vercel /pay/[bookingId]
  participant W as Phantom Wallet

  C->>EL: Booking conversation
  EL->>API: POST /webhook/elevenlabs<br/>tool=create_booking_intent
  API->>SOL: create_booking_intent<br/>signed by bridge wallet
  SOL-->>API: booking_id + Booking PDA
  API-->>EL: payment_url = FRONTEND_URL/pay/booking_id
  EL-->>C: Open deposit payment link

  C->>WEB: Open /pay/[bookingId]
  WEB->>SOL: Fetch Booking PDA via Anchor client
  SOL-->>WEB: booking state + deposit amount
  C->>W: Approve lock_deposit transaction
  W->>SOL: lock_deposit<br/>transfer USDC to escrow
  SOL-->>WEB: transaction signature
  WEB-->>C: Show Solana Explorer link
```

## Required Service Wiring

```mermaid
flowchart TB
  subgraph frontend["Vercel env"]
    f1["NEXT_PUBLIC_RPC_URL"]
    f2["NEXT_PUBLIC_NETWORK"]
    f3["NEXT_PUBLIC_PROGRAM_ID"]
    f4["NEXT_PUBLIC_USDC_MINT"]
    f5["NEXT_PUBLIC_API_URL"]
  end

  subgraph bridge["FastAPI/Railway env"]
    b1["SOLANA_RPC_URL"]
    b2["SOLANA_NETWORK"]
    b3["ANCHOR_PROGRAM_ID"]
    b4["ANCHOR_WALLET"]
    b5["USDC_MINT"]
    b6["PUBLIC_API_URL"]
    b7["FRONTEND_URL"]
  end

  subgraph services["Runtime services"]
    v["Vercel frontend"]
    r["Railway FastAPI bridge"]
    s["Solana RPC"]
    e["ElevenLabs tools"]
  end

  f1 --> v
  f2 --> v
  f3 --> v
  f4 --> v
  f5 --> v

  b1 --> r
  b2 --> r
  b3 --> r
  b4 --> r
  b5 --> r
  b6 --> r
  b7 --> r

  v -->|"reads/writes through wallet"| s
  r -->|"backend-signed booking intents"| s
  e -->|"tool webhook URL = PUBLIC_API_URL/webhook/elevenlabs"| r
  r -->|"returns FRONTEND_URL/pay/[bookingId]"| e
```

## Integration Checklist

| Integration | Host | Required for MVP | Purpose |
|---|---|---:|---|
| Vercel Next.js app | Vercel | Yes | SMB dashboard, business onboarding, customer deposit payment route |
| FastAPI bridge | Railway/container host | Yes | Receives ElevenLabs tool calls and creates booking intents |
| Solana RPC | Helius/QuickNode/public devnet | Yes | Reads/writes Anchor accounts |
| Phantom wallet | Browser extension | Yes | Signs SMB and customer transactions |
| Anchor program | Solana devnet | Yes | Holds Business/Booking state and USDC escrow logic |
| ElevenLabs Conversational AI | ElevenLabs | Needed for voice demo | Calls FastAPI bridge tools from a Polish voice agent |
| Twilio/SMS | Future | No | Phone/SMS path after browser demo |
| Privy | Future | No | Embedded customer wallet UX |
| Mercuryo | Future | No | Fiat to USDC onramp |
| Supabase/Postgres | Future | No | Analytics, RAG, recordings, GDPR workflows |

