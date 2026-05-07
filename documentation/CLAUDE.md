# CLAUDE.md — Project Conventions for Claude Code

> Read me first. I tell Claude (and humans) how this codebase wants to be edited.

---

## What this project is (1 paragraph)

**VoiceDesk** is a voice agent that talks **directly to Solana** to lock and release **service deposits** — booking-time collateral that any service business holds against no-shows, damages, late returns, or overage. The same on-chain primitive serves **hotels, car rentals, ski rentals, equipment rentals, restaurants, dental clinics, salons, and coworking spaces**. Customer talks → agent creates booking on-chain → customer signs deposit → at end of service, deposit is released, partially claimed (damages), or fully claimed (no-show). Built for **Solana Frontier 2026** (Colosseum + SuperTeam Poland), submission deadline **2026-05-11**.

**MVP scope discipline:** Voice agent ↔ Solana (no Postgres, no SMS, no fiat onramp, no x402 — those are Phase 2+). Solana **is** the database for MVP.

Full context: [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) · architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Tech stack (locked decisions — do not change without ADR)

### MVP — what we ship by 2026-05-11

| Layer | Technology |
|---|---|
| Smart contracts | Rust + Anchor 0.30 |
| AI engine | Python 3.11 + FastAPI (thin bridge, ~200 lines) |
| Voice | ElevenLabs Conversational AI (browser widget) |
| Frontend | TypeScript + Next.js 14 (App Router) |
| UI | Tailwind + shadcn/ui |
| Wallet | Phantom via @solana/wallet-adapter |
| Network | Solana devnet (dev) → mainnet (demo polish) |
| Stablecoin | USDC SPL |
| Database | **Solana itself — no separate DB for MVP** |
| Container | Docker + compose.dev.yml |
| Hosting | Vercel (web) + Railway (AI engine) |

### Phase 2+ — explicitly NOT in MVP

These appear in PROJECT_OVERVIEW roadmap but **are not MVP scope**. Do not build unless lifted by an ADR.

- ❌ Twilio Programmable Voice / SMS (browser voice only for MVP)
- ❌ Privy embedded wallets (Phantom only for MVP)
- ❌ Mercuryo / fiat onramp (Phantom users have USDC)
- ❌ Postgres / Supabase (Solana = DB for MVP)
- ❌ pgvector / RAG (no FAQ search needed in MVP)
- ❌ KSeF live integration (mock acceptable, not in critical path)
- ❌ x402 per-resolved-ticket settlement (deposit primitive alone is the demo)
- ❌ LLM judge (Claude Sonnet) — only the agent's tool reasoning in MVP, no separate judging service
- ❌ Oracle / Ed25519 signer service — no off-chain signed receipts in MVP

---

## Repo layout

```
AI_Voice_Agent/
├── README.md                 ← GitHub-facing entry point
├── Dockerfile                ← Python AI engine
├── compose.dev.yml           ← dev compose with hot-reload
├── .env.example              ← all env vars (no secrets)
│
├── programs/voicedesk/       ← Rust + Anchor (smart contracts)
│   └── src/
│       ├── lib.rs
│       ├── state/            ← account types (one file per PDA)
│       └── instructions/     ← one file per instruction
│
├── tests/                    ← Anchor TypeScript integration tests
│
├── app/                      ← Next.js 14 frontend
│   ├── (public)/             ← customer PWA, no Phantom required
│   ├── (writer)/             ← SMB dashboard, Phantom required
│   └── (admin)/              ← protocol admin
│
├── ai_engine/                ← Python FastAPI THIN BRIDGE (MVP)
│   ├── main.py               ← FastAPI app, ~200 lines, ElevenLabs webhooks → Solana
│   ├── solana_client.py      ← Anchor IDL bindings (solana-py)
│   └── voice_agent/
│       └── personas/         ← one .md file per vertical
│           ├── hotel_pl.md
│           ├── car_rental_pl.md
│           ├── ski_rental_pl.md
│           ├── restaurant_pl.md
│           ├── dental_pl.md
│           └── salon_pl.md
│
└── documentation/            ← all non-code documentation
    ├── PROJECT_OVERVIEW.md
    ├── CLAUDE.md             ← this file
    ├── ARCHITECTURE.md       ← MVP architecture + universal deposit primitive
    └── (more docs as we build)
```

---

## Repo conventions

### General
- **Monorepo**, no workspace tooling beyond `pnpm` + `cargo`.
- **No premature abstraction.** If you'd write the same code three times → maybe extract. Two times → don't.
- **Comments only when WHY is non-obvious.** Code should explain WHAT.
- **No emoji in source code** unless explicitly requested.

### Smart contracts (Rust)
- One file per instruction in `programs/voicedesk/src/instructions/`.
- One file per account type in `programs/voicedesk/src/state/`.
- All errors centralized in `errors.rs` with descriptive `#[error_code]` enums.
- PDA seeds documented at the top of each state file.
- **Every smart contract change requires a corresponding TypeScript test in `/tests/`.**
- Use Anchor account validation macros (`#[account(...)]`) — do not hand-roll account checks.

### AI engine (Python — thin bridge for MVP)
- The Python service is a **~200-line bridge**, not a heavy backend. Resist scope creep.
- All I/O models use **Pydantic v2**.
- Polish persona prompts live in `ai_engine/voice_agent/personas/*.md` — **never inline**.
- ElevenLabs tool webhooks land in `main.py` and translate directly to Solana RPC calls.
- Solana access through `solana_client.py` (Anchor IDL bindings via `solana-py` / `anchorpy`).
- **No Postgres / Supabase reads in MVP** — Solana is the source of truth.
- Tests use `pytest` with `httpx.AsyncClient` for FastAPI endpoints.
- Type hints required on all public functions (mypy strict).

### Frontend (TypeScript / Next.js)
- **Route groups are auth boundaries.** Never mix `(public)`, `(writer)`, `(admin)` contexts.
- `(public)` = customer-facing voice widget + deposit signing. Phantom wallet only for MVP.
- `(writer)` = SMB dashboard. Phantom wallet required for every page.
- `(admin)` = hardcoded admin pubkey allowlist (or CLI-only for hackathon).
- Solana client auto-generated from Anchor IDL → `app/lib/anchor-client.ts`.
- Shared shadcn components in `app/components/ui/`.
- Voice widget uses ElevenLabs Conversational AI **WebRTC SDK** in browser (no Twilio for MVP).

### Documentation
- All Mermaid lives in `documentation/architecture/DIAGRAMS.md` and is referenced from elsewhere.
- All ADRs (architecture decisions) append-only in `documentation/architecture/DECISIONS.md`.
- Markdown headings: H1 only at top of file, never mid-document.
- Code blocks always have a language tag.

---

## Commands you'll run a lot

### Smart contracts
```bash
cd programs/voicedesk
anchor build                                            # compile
anchor deploy --provider.cluster devnet                 # deploy to devnet
anchor test                                             # run TS tests
anchor test --skip-local-validator                      # run against devnet
solana airdrop 5 <PUBKEY> --url devnet                  # fund test wallet
```

### AI engine (thin bridge)
```bash
cd ai_engine
poetry install
poetry run uvicorn main:app --reload --port 8000        # dev server
poetry run pytest                                       # tests
poetry run mypy .                                       # type check
docker compose -f ../compose.dev.yml up ai_engine       # containerized dev
```

### Frontend
```bash
cd app
pnpm install
pnpm dev                                                # dev server (port 3000)
pnpm build                                              # production build
pnpm typecheck                                          # tsc --noEmit
pnpm lint                                               # eslint
```

### Full stack
```bash
docker compose -f compose.dev.yml up                    # everything at once
ngrok http 8000                                         # expose bridge to ElevenLabs tool webhooks
```

---

## Common tasks (recipes)

| Task | Steps |
|---|---|
| Add a new Anchor instruction | (1) Create file in `programs/voicedesk/src/instructions/` (2) Re-export in `lib.rs` (3) Add TS test in `/tests/` (4) Update `documentation/ARCHITECTURE.md` instruction table |
| Add a new vertical | (1) Add enum variant in `state/business.rs` `Vertical` (2) Create `ai_engine/voice_agent/personas/{vertical}_pl.md` (3) Add row to vertical table in `documentation/ARCHITECTURE.md` |
| Add a new agent persona language | (1) Create `ai_engine/voice_agent/personas/{vertical}_{lang}.md` (2) Wire in voice agent config |
| Add a new dashboard view | (1) Create `app/(writer)/{view-name}/page.tsx` (2) Add wallet check (3) Use generated Anchor client |
| Add a new env var | (1) Add to `.env.example` with description (2) Document in `documentation/ENVIRONMENT.md` (3) Use `process.env.X!` (TS) or `os.environ["X"]` (Py) — never hardcode defaults |
| Update an architectural decision | Append new ADR in `documentation/DECISIONS.md` — never edit old ones |
| Lift something from the "NOT in MVP" list | Requires an ADR + reviewer agreement. Default answer is "no, not for MVP." |

---

## Things to NEVER do

- ❌ **Commit secrets.** `.env` files are gitignored. Use `.env.example` only.
- ❌ **Skip Anchor tests before deploy.** Even on devnet.
- ❌ **Hardcode prompts in Python code.** Always import from `personas/*.md`.
- ❌ **Add a Postgres / Supabase read-write path in MVP.** Solana is the database.
- ❌ **Add Twilio / SMS / Mercuryo / Privy in MVP** without lifting the "NOT in MVP" list via ADR.
- ❌ **Add an off-chain LLM judge / oracle service in MVP.** The agent's tool reasoning is enough.
- ❌ **Mix wallet contexts across route groups.** Phantom logic in `(public)` is a bug.
- ❌ **Bypass `anchor` for raw Solana web3.js calls** — keep the abstraction layer.
- ❌ **Use `--skip-preflight` on Solana transactions** in production paths.
- ❌ **Change tech stack without an ADR.** Even small additions like a new utility lib.
- ❌ **Add emoji to source code or commit messages** unless explicitly requested.

---

## Hackathon-specific context (read this every session)

- **Submission deadline: 2026-05-11.**
- Three side tracks targeted: ElevenLabs ($10K pool), PKO BP Let's Fintech ($10K), Mastercard.
- Main accelerator prize: $250K + Cohort 5 entry.
- **Demo customer:** Polish hotel / car rental / ski rental / dental clinic — pick one with strong visual story.
- **Demo flow:** browser voice agent → booking conversation → on-chain deposit lock → service completion → release / claim.
- **MVP positioning:** "Voice-initiated lock-and-release deposit primitive on Solana — works for any service business that holds collateral against no-shows or damages."

If you (Claude) are reading this mid-session and unsure whether to add a feature: **ask whether it's needed for the demo, or whether it's roadmap material**. Hackathon scope is brutal — defaults are "skip and document as future work." Anything from the "Phase 2+" / "NOT in MVP" lists requires an ADR to lift.

---

## When you're stuck

1. **Check `ARCHITECTURE.md`** for the MVP system flow + universal deposit primitive.
2. **Check `PROJECT_OVERVIEW.md`** for scope/requirement clarification.
3. **Check `DECISIONS.md`** (when it exists) for prior reasoning.
4. **Re-read this file** before suggesting a stack change.
5. **Ask the human** before doing anything destructive (force push, migration, key rotation).

---

## Definition of "done" (per task)

A task is done when:
- ✅ Code compiles / type-checks / tests pass
- ✅ Touched docs updated (env vars, instruction reference, ADR if architectural)
- ✅ Smoke-tested end-to-end (anchor test, real phone call, real PWA flow)
- ✅ No TODO/FIXME left in committed code
- ✅ Reviewed by one team member other than the author

---

**Last updated:** 2026-05-07 (MVP simplification)
**Maintainers:** Tech lead + PM
**See also:** [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · root [`README.md`](../README.md)
