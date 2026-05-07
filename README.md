# AI Voice Agent — VoiceDesk + PolishFront

> **x402-native voice support infrastructure for Polish SMBs.**
> Built for **Solana Frontier 2026** (Colosseum × SuperTeam Poland).

---

## What this is

**VoiceDesk** replaces per-seat customer-support SaaS with **per-resolved-outcome stablecoin micropayments on Solana**. SMBs deploy a Polish-language ElevenLabs voice agent in minutes, fund a USDC bond, and pay only when calls actually get resolved.

**PolishFront** is the launch vertical: anti-no-show booking deposits for Polish dentists, salons, and restaurants. Customers confirm bookings with a small refundable USDC deposit by SMS — full refund on attendance, forfeit on no-show. KSeF-compliant invoices auto-generated.

## Why now

| | |
|---|---|
| **2026-05-05** | Solana × Google Cloud launch Pay.sh + x402 (per-request stablecoin micropayments for AI agents) |
| **2026-05-04** | Western Union launches USDPT on Solana — mainstream stablecoin adoption signal |
| **2026-02** | Polish KSeF e-invoicing becomes mandatory for B2B |
| **2026** | ElevenLabs at $11B valuation, no crypto-native partnerships exist yet |
| **First mover** opportunity at the intersection of voice AI + per-outcome crypto payments + Polish SME compliance |

## Targeted prizes

- 🏆 **Colosseum main accelerator** — $250K pre-seed + Cohort 5 entry
- 🥇 **SuperTeam Poland × ElevenLabs** — $5K / $3K / $2K
- 🥇 **PKO BP × Let's Fintech** — $10K total
- 🥇 **Mastercard × SuperTeam Poland** — TBD

## Tech stack

- **Smart contracts:** Rust + Anchor 0.30 (Solana)
- **AI engine:** Python 3.11 + FastAPI + Claude Sonnet 4.6
- **Voice:** ElevenLabs Conversational AI (Polish)
- **Telephony:** Twilio Programmable Voice + SMS
- **Frontend:** TypeScript + Next.js 14 + Tailwind + shadcn/ui
- **Wallets:** Phantom (SMB) + Privy embedded (customers, no crypto knowledge needed)
- **Onramp:** Mercuryo BLIK → USDC
- **Database:** Supabase (Postgres + pgvector)
- **Stablecoin:** USDC SPL Token

## Repo structure

```
AI_Voice_Agent/
├── README.md                  ← you are here
├── Dockerfile                 ← Python AI engine container
├── compose.dev.yml            ← dev compose with hot-reload
├── .env.example
│
├── programs/voicedesk/        ← Rust + Anchor smart contracts
├── tests/                     ← Anchor TS integration tests
├── app/                       ← Next.js 14 frontend
│   ├── (public)/              ← customer PWA (no wallet needed)
│   ├── (writer)/              ← SMB dashboard (Phantom)
│   └── (admin)/               ← protocol admin
├── ai_engine/                 ← Python FastAPI services
│   ├── main.py
│   ├── voice_agent/
│   ├── judge/
│   └── oracle/
└── documentation/             ← all project docs
    ├── PROJECT_OVERVIEW.md    ← full requirements
    └── CLAUDE.md              ← conventions for contributors
```

## Quick start

```bash
# 1. Clone
git clone https://github.com/Olokolo1990/AI_Voice_Agent.git
cd AI_Voice_Agent

# 2. Copy env template (fill in your keys)
cp .env.example .env

# 3. Run everything via Docker
docker compose -f compose.dev.yml up

# OR run services separately:

# Smart contracts
cd programs/voicedesk
anchor build && anchor deploy --provider.cluster devnet
anchor test

# AI engine
cd ai_engine
poetry install
poetry run uvicorn main:app --reload --port 8000

# Frontend
cd app
pnpm install
pnpm dev
```

Full setup instructions: see [`documentation/SETUP.md`](./documentation/SETUP.md) (TBD).

## Architecture at a glance

```
[Customer phone]
     │
     ▼
[Twilio] ──► [ElevenLabs Polish Agent]
                       │
                       ▼
            [FastAPI AI engine]
            ┌──────────────────┐
            │ judge (Claude)   │
            │ oracle (Ed25519) │
            │ tools (booking)  │
            └──────────────────┘
                       │
                       ▼
            [Anchor program on Solana]
            ┌──────────────────────┐
            │ SmbAccount PDA       │
            │ Booking PDA          │
            │ TicketReceipt PDA    │
            │ ProtocolTreasury PDA │
            └──────────────────────┘
                       │
                       ▼
            USDC settlement
                       │
                       ▼
[SMB Dashboard] ◄──── realtime updates
[Customer PWA] ◄──── refund / KSeF invoice
```

Detailed UML diagrams: see [`documentation/architecture/DIAGRAMS.md`](./documentation/architecture/DIAGRAMS.md) (TBD).

## Documentation

| Doc | Purpose |
|---|---|
| [PROJECT_OVERVIEW.md](./documentation/PROJECT_OVERVIEW.md) | Vision, requirements, scope, timeline |
| [CLAUDE.md](./documentation/CLAUDE.md) | Conventions for Claude Code & contributors |
| Architecture | (TBD) Mermaid diagrams + decision records |
| Setup | (TBD) Local development from zero |
| Smart contract reference | (TBD) Every instruction with examples |
| API reference | (TBD) FastAPI endpoints |
| Demo runbook | (TBD) How to run the live demo |

## Hackathon timeline

- **2026-05-07** — Foundation (skeleton, docs, Anchor stubs)
- **2026-05-08** — Core build (instructions, voice agent, Twilio)
- **2026-05-09** — Settlement + polish (x402 flow, dashboard realtime)
- **2026-05-10** — Submission day (demo recording, 4 submissions filed)
- **2026-05-11** — Submission deadline ⏰

## Status

🚧 **In active development.** Hackathon submission deadline: **2026-05-11**.

## License

TBD — likely MIT or Apache 2.0.

---

**Built with ❤️ for the Polish Solana community.**
