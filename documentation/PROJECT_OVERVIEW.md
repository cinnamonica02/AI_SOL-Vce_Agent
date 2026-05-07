# PROJECT OVERVIEW

> **VoiceDesk** — voice-initiated **lock-and-release deposit primitive** on Solana, for any service business that holds collateral against no-shows or damages.
> Built for **Solana Frontier 2026 (Colosseum + SuperTeam Poland)**.

---

## 1. Vision

A voice agent that talks **directly to Solana** and turns booking-time deposits into a programmable, neutral, on-chain primitive that works the same way for **hotels, car rentals, ski rentals, equipment rentals, restaurants, dental clinics, salons, and coworking spaces**.

Customer talks to the agent → agent creates a booking on-chain → customer signs a USDC deposit (locked in escrow) → at end of service, the deposit is **released** (happy path), **partially claimed** (damages), or **fully claimed** (no-show). One Anchor primitive, every vertical reuses it.

**MVP architecture is intentionally minimal:** voice agent ↔ Solana, with Solana as the database. No Postgres, no SMS, no fiat onramp, no x402 ticket settlement — those live in Phase 2+. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the simplification rationale.

## 2. Hackathon Context

| Item | Value |
|---|---|
| Hackathon | Colosseum Frontier 2026 |
| Regional partner | SuperTeam Poland |
| Submission deadline | **2026-05-11** |
| Time remaining (as of writing) | ~96 hours |
| Targeted side tracks | ElevenLabs ($5K/$3K/$2K), PKO BP Let's Fintech ($10K), Mastercard |
| Main accelerator prize | $250K pre-seed + program access (Cohort 5) |

## 3. Problem Statement

### 3.1 Validated pain points (data-backed)

- **SMBs lose ~$126K/year to missed calls**; 85% of callers never call back ([Phone2 industry data](https://www.phone2.io/post/true-cost-of-missed-calls)).
- **Restaurant no-show rates: 30–45% per night** in major cities; existing card-hold solutions are user-hostile and high-friction.
- **70% of SMBs cannot afford** $50–325/month seat licenses for Twilio/Zendesk/Smith.ai; the market is structurally underserved.
- **Polish IT contractors and freelancers** face $25–50 wire fees + 1–3% FX on cross-border payments; KSeF e-invoicing mandate (Feb 2026) adds compliance burden.
- **No existing tool** combines voice AI front-desk + on-chain refundable deposits + KSeF compliance for the Polish SMB market.

### 3.2 Why nobody has built this yet

1. **x402 micropayment infrastructure didn't exist** until 2026-05-05 (Solana × Google Cloud Pay.sh launch — 2 days before this hackathon).
2. **Embedded wallet UX** for non-crypto users (Privy/Magic) only matured in late 2025.
3. **Polish-language voice quality** in ElevenLabs Conversational AI reached production-grade in early 2026.
4. The intersection of **enterprise voice AI + per-outcome crypto payments + Polish compliance** has zero existing competitors.

## 4. Solution Architecture (high level)

The MVP has **one on-chain primitive** — a generalized deposit/escrow — used by every vertical:

```
create_booking(business, customer, deposit, service_window)
   ↓
[Escrow PDA holds deposit]
   ↓
   ├─ release_full(booking_id)          → 100% to customer (happy path)
   ├─ release_partial(booking_id, %)    → split customer/business (damages)
   ├─ claim_full(booking_id)            → 100% to business (no-show)
   └─ customer_cancel(booking_id)       → tiered refund based on timing
```

**MVP stack is three boxes plus a wallet:**

```
[Customer] ←→ [Voice Agent] ←→ [Solana program]
                                     ↑
              [Customer wallet]──────┘ signs deposit
```

- **Voice agent:** ElevenLabs Conversational AI in browser (WebRTC). Tool calls hit a thin FastAPI bridge.
- **Bridge:** ~200 lines of Python translating ElevenLabs tool calls into Solana RPC.
- **Solana:** Anchor program holds all state (businesses, bookings, escrow). No separate database.
- **Wallet:** Phantom for MVP. Privy embedded wallets in Phase 2.

Full architecture, vertical applications, and account model: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## 5. Why Now (Market Timing)

| Signal | Date | Implication |
|---|---|---|
| Solana × Google Cloud launch Pay.sh + x402 | 2026-05-05 | Judges actively hunting for x402 demos |
| Western Union launches USDPT on Solana | 2026-05-04 | Mainstream stablecoin adoption signal |
| ElevenLabs raises $500M at $11B valuation | 2026-02-04 | Voice AI is enterprise-ready, no crypto-native partnerships yet |
| Polish KSeF e-invoicing becomes mandatory | 2026-02 | Compliance wedge for Polish SMBs |
| SuperTeam Poland × ElevenLabs side track announced | 2026 | Direct sponsor alignment |

## 6. Success Criteria (definition of done)

### 6.1 Hackathon submission requirements
- ✅ Working Anchor program deployed to Solana devnet (mainnet stretch)
- ✅ End-to-end demo: real phone call → booking → on-chain deposit → settlement
- ✅ 3-minute demo video uploaded to Loom/YouTube
- ✅ Public GitHub repo with full source + documentation
- ✅ Submissions filed for: Colosseum main + 3 side tracks
- ✅ Live deployment URL (Vercel)

### 6.2 Quality bars
- Anchor program passes 100% of integration tests
- ElevenLabs Polish agent handles 3 verticals (dentist, salon, restaurant)
- Demo customer can be a real Polish SMB (or realistic mock)
- Privy embedded wallet flow works without Phantom installation
- Mercuryo BLIK→USDC onramp wired (mock acceptable as fallback)

### 6.3 Stretch goals (nice-to-have)
- 1+ real Polish SMB pilot user with actual deposit on devnet
- Mainnet program deployment with audited deposits
- Drift team / ElevenLabs team endorsement quote in pitch
- Twitter/X post from SuperTeam Poland account

## 7. Functional Requirements

### 7.1 SMB-facing (writer / dashboard)
- FR-W1: Sign up with Phantom wallet
- FR-W2: Configure business profile (name, industry, services, calendar)
- FR-W3: Auto-generate Polish voice agent persona based on business type
- FR-W4: Provision Twilio phone number forwarded to ElevenLabs agent
- FR-W5: Deposit and withdraw USDC bond
- FR-W6: View live ticket feed with resolution status
- FR-W7: Confirm appointment attendance / claim no-show
- FR-W8: View KSeF-compliant invoices generated per booking
- FR-W9: Calculate savings vs. seat-license pricing

### 7.2 Customer-facing (public PWA)
- FR-P1: Receive SMS deep-link with Solana Pay deposit URL
- FR-P2: Pay deposit via Privy embedded wallet (no Phantom required)
- FR-P3: Onramp PLN → USDC via Mercuryo (BLIK supported)
- FR-P4: View booking status and cancel within policy windows
- FR-P5: Receive refund automatically upon attendance confirmation
- FR-P6: View KSeF invoice after booking completion

### 7.3 Voice agent (AI engine)
- FR-A1: Answer inbound calls in Polish within 1 second
- FR-A2: Handle FAQ via RAG over SMB knowledge base
- FR-A3: Book/cancel/reschedule appointments via calendar tool
- FR-A4: Send SMS deposit links via Twilio tool
- FR-A5: Escalate to human (forward call) when confidence < threshold
- FR-A6: Generate Polish/EN dual-language summary for SMB log
- FR-A7: Tag conversation outcome (resolved / escalated / failed)

### 7.4 Settlement (smart contracts + oracle)
- FR-S1: Lock booking deposit in escrow PDA on customer payment
- FR-S2: Release deposit on attendance confirmation (full refund)
- FR-S3: Forfeit deposit on no-show after grace period (95% SMB / 5% protocol)
- FR-S4: Tiered refund for customer cancellation (>24h = 100%, <24h = 50%)
- FR-S5: Validate oracle Ed25519 signature on ticket receipts
- FR-S6: Enforce SLA: skip payment if resolution_time > threshold
- FR-S7: Track per-SMB ticket counters (resolved, sla_failed, escalated)
- FR-S8: Allow protocol admin to withdraw treasury fees

### 7.5 Protocol admin
- FR-AD1: View aggregate treasury balance (collected x402 fees + no-show forfeits)
- FR-AD2: Withdraw treasury to admin wallet
- FR-AD3: Resolve disputes between SMB and customer (manual override)
- FR-AD4: Update SLA defaults / fee tiers via governance instruction (post-hackathon)

## 8. Non-Functional Requirements

### 8.1 Performance
- NFR-P1: Voice agent response latency ≤ 800ms (ElevenLabs production SLA)
- NFR-P2: SMS deposit link delivery ≤ 5 seconds after call ends
- NFR-P3: Solana Pay transaction confirmation ≤ 3 seconds (devnet/mainnet)
- NFR-P4: Dashboard realtime updates ≤ 1 second after on-chain event

### 8.2 Reliability
- NFR-R1: Anchor program must handle network failures gracefully (no orphaned escrows)
- NFR-R2: All instruction validation must reject malformed inputs deterministically
- NFR-R3: Oracle signature verification must use canonical encoding (Borsh)
- NFR-R4: Booking deposits must always be retrievable by customer or SMB (no stuck funds)

### 8.3 Security
- NFR-S1: Oracle signing key stored in environment variable, never committed
- NFR-S2: Phantom and Privy wallet flows must use hardware-backed signing where available
- NFR-S3: Anchor program must validate PDA seeds on every instruction
- NFR-S4: Customer phone numbers stored hashed (not plaintext) in Postgres
- NFR-S5: KSeF API credentials encrypted at rest (Supabase RLS)

### 8.4 Compliance
- NFR-C1: KSeF-compliant invoice generation for all Polish bookings (mock acceptable for hackathon)
- NFR-C2: GDPR-compliant data retention (call recordings deleted after 30 days)
- NFR-C3: Cookie consent banner in public PWA (Polish + English)
- NFR-C4: SMB onboarding includes terms-of-service acknowledgment

### 8.5 Localization
- NFR-L1: Primary language: Polish (PL)
- NFR-L2: Voice agent must use natural Polish (not translated English)
- NFR-L3: SMS templates in Polish
- NFR-L4: Public PWA supports PL + EN switcher
- NFR-L5: KSeF invoice format follows Polish tax authority spec

### 8.6 Accessibility
- NFR-A1: PWA meets WCAG 2.1 AA on critical paths (deposit payment, booking view)
- NFR-A2: Voice agent supports senior/dysarthric speech tolerance (longer wait times configurable)
- NFR-A3: Dashboard supports keyboard-only navigation

## 9. Technical Requirements

### 9.1 Tech stack (locked)
| Layer | Technology | Version |
|---|---|---|
| Smart contracts | Rust + Anchor | 0.30+ |
| AI engine | Python + FastAPI | 3.11+ / FastAPI 0.110+ |
| LLM judge | Claude Sonnet 4.6 | via Anthropic SDK |
| Voice agent | ElevenLabs Conversational AI | latest |
| STT (fallback) | ElevenLabs Scribe | latest |
| Telephony | Twilio Programmable Voice + SMS | latest |
| Frontend | TypeScript + Next.js (App Router) | 14+ |
| UI library | Tailwind + shadcn/ui | latest |
| Customer wallet | Privy embedded | latest |
| SMB wallet | Phantom via @solana/wallet-adapter | latest |
| Onramp | Mercuryo (BLIK → USDC) | latest |
| Database | Supabase (Postgres + pgvector) | latest |
| Solana network | devnet (dev) → mainnet (demo polish) | — |
| Stablecoin | USDC SPL Token | — |
| Container | Docker + compose.dev.yml | — |
| Hosting | Vercel (web) + Railway (AI engine) | — |

### 9.2 External dependencies (require API keys)
- ElevenLabs (voice agent provisioning)
- Twilio (phone numbers + SMS)
- Anthropic (Claude judge)
- Supabase (database)
- Privy (embedded wallets)
- Mercuryo (fiat onramp)
- KSeF API (invoicing — mock acceptable for hackathon)

### 9.3 Infrastructure
- Solana RPC (Helius or QuickNode for production-grade)
- ngrok (local Twilio webhook tunneling during dev)
- GitHub Actions (CI: anchor build + test on every PR)

### 9.4 Repo structure (target)
```
AI_Voice_Agent/
├── README.md
├── CLAUDE.md → see documentation/CLAUDE.md
├── Dockerfile
├── compose.dev.yml
├── .env.example
├── programs/
│   └── voicedesk/
├── tests/
├── app/
│   ├── (public)/
│   ├── (writer)/
│   └── (admin)/
├── ai_engine/
│   ├── main.py
│   ├── voice_agent/
│   ├── judge/
│   └── oracle/
└── documentation/
```

## 10. Side Track Requirements

### 10.1 SuperTeam Poland × ElevenLabs ($10K total prize pool)
**Mandatory:** ElevenLabs as primary voice provider — ✅ aligned by default.
**Bonus:** Polish-language Conversational AI agent — ✅ core to product.
**Bonus:** ElevenLabs Scribe STT for fallback paths — ✅ planned.

### 10.2 PKO BP × Let's Fintech ($10K)
**Mandatory:** SME-focused financial tool — ✅ VoiceDesk is SME-only.
**Bonus:** Polish market focus — ✅ PolishFront is Poland-native.
**Bonus:** Stablecoin payments — ✅ USDC core to settlement.
**Bonus:** Compliance angle (KSeF) — ✅ included in scope.

### 10.3 Mastercard × SuperTeam Poland
**Mandatory:** Stablecoin payments infrastructure — ✅ x402 + USDC core.
**Bonus:** Cross-border use case — ✅ Polish freelancer angle in roadmap.
**Bonus:** Mainstream onramp UX — ✅ Privy + Mercuryo BLIK flow.

### 10.4 Colosseum main accelerator
**Mandatory:** Solana-native, novel, demoable, fundable — ✅ all four.
**Bonus:** First-mover on x402 (launched 2 days before hackathon) — ✅ unique angle.
**Bonus:** Behavioral commitment infra (post-hackathon expansion path) — ✅ in roadmap.

## 11. Out of Scope (explicit non-goals for MVP / hackathon)

These items are **explicitly NOT in MVP**. Lifting any of them requires an ADR.

### Architecture / infrastructure cuts (made 2026-05-07 to simplify MVP)
- ❌ **Twilio Programmable Voice / SMS** — browser voice widget only for MVP
- ❌ **Privy embedded wallets** — Phantom only for MVP
- ❌ **Mercuryo / fiat onramp (BLIK → USDC)** — Phantom users have USDC
- ❌ **Postgres / Supabase / pgvector** — Solana is the database for MVP
- ❌ **x402 per-resolved-ticket settlement** — deposit primitive alone is the demo
- ❌ **Off-chain LLM judge / Ed25519 oracle service** — agent's tool reasoning is enough
- ❌ **KSeF live invoice integration** — mock acceptable (or skip in critical path)

### Product scope cuts
- ❌ Multi-language support beyond Polish + English fallback
- ❌ Native iOS/Android apps (web only)
- ❌ Voice biometrics / sentiment detection
- ❌ Token launch / governance token
- ❌ Mainnet program audit (devnet sufficient for demo)
- ❌ Payroll / employee management
- ❌ AI marketing tools / outbound calling
- ❌ Healthcare-specific HIPAA compliance (vertical excluded)

## 12. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| ElevenLabs Polish voice quality below target | High | Low | Pre-test with 5+ sample dialogues before D2 |
| Twilio webhook lag in demo | High | Medium | Pre-record fallback audio for live demo |
| Privy + Mercuryo onramp integration delay | Medium | Medium | Mock onramp for D1-D3, real for D4 only |
| Solana devnet downtime during demo | High | Low | Backup to localhost validator, mainnet ready |
| Oracle signing key compromise | Critical | Very Low | Rotate keys post-hackathon, use Vault in prod |
| KSeF API access not available | Low | High | Mock invoice generator (template + UUID) |
| Team member illness / unavailability | High | Medium | Documentation-first ensures swap-in possible |
| x402 spec changes mid-hackathon | Medium | Low | Lock to spec snapshot from May 5 |

## 13. Team

| Role | Name | Wallet | Responsibilities |
|---|---|---|---|
| Tech lead | TBD | TBD | Anchor program, architecture, infra |
| Rust dev | TBD | TBD | Smart contract instructions + tests |
| Python / AI dev | TBD | TBD | FastAPI, ElevenLabs integration, Claude judge |
| TypeScript / UI dev | TBD | TBD | Next.js dashboard + PWA |
| PM / Pitch | TBD | TBD | Submissions, demo script, business docs |

(To be filled in by team — replace TBDs.)

## 14. Timeline

```
2026-05-07 (D1) ── Foundation
                   - Skeleton scaffolded
                   - Anchor program stubs
                   - ElevenLabs persona for dentist live
                   - Tier 0 + Tier 1 docs drafted

2026-05-08 (D2) ── Core build
                   - Bond + booking + cancel instructions complete
                   - Twilio inbound webhook wired
                   - Customer PWA with Privy
                   - Tier 2 docs progressed

2026-05-09 (D3) ── Settlement + polish
                   - x402 settlement flow end-to-end on devnet
                   - SMB dashboard realtime updates
                   - KSeF mock invoice
                   - Tier 2 docs complete

2026-05-10 (D4) ── Submission day
                   - Demo recording (Loom)
                   - 4 submissions filed (Colosseum + 3 side tracks)
                   - Final README + screenshots

2026-05-11      ── Submission deadline (midnight UTC)
```

## 15. Demo Plan (3-minute video)

| Time | Scene | Notes |
|---|---|---|
| 0:00–0:20 | Hook: "$126K/yr lost to missed calls" | Stock footage + stats overlay |
| 0:20–0:50 | Live phone call to demo Polish dentist | Real Twilio number, ElevenLabs Polish voice |
| 0:50–1:20 | Booking → SMS → Privy + BLIK → USDC deposit on-chain | Screen capture of phone + browser |
| 1:20–2:00 | x402 settlement on Solana explorer (live) | Real devnet tx |
| 2:00–2:30 | SMB dashboard: realtime savings vs seat license | Mock data showing savings calc |
| 2:30–3:00 | "What this unlocks" + 3 side track logos | Closing pitch + GitHub link |

## 16. Roadmap (post-hackathon, 12 months)

### Q3 2026
- Mainnet deployment with formal audit
- 10 paying SMB customers in Warsaw + Krakow
- KSeF live integration
- Onboard 1 Polish dental network as anchor partner

### Q4 2026
- Expand verticals: hair salons, restaurants, law offices
- Voice biometrics for fraud detection (anti-vishing)
- Drift / Hyperliquid integration for behavioral commitment app (Discipline Daemon — separate product on same protocol)

### Q1 2027
- Multi-language: Czech, Slovak, Hungarian (CEE expansion)
- White-label SDK for prop firms / SaaS partners
- Series A raise targeting €5M

### Q2 2027
- Mastercard partnership for cross-border SME card issuance
- Reputation NFT layer (verifiable trader/business track records)

## 17. Comparable Companies

| Company | Valuation | What we share | What's different |
|---|---|---|---|
| Intercom | $3B+ | Customer support layer | Per-seat SaaS, no crypto |
| Zendesk | $10B | Multi-channel support | Enterprise-only, no SMB voice-first |
| Booksy | $1B+ unicorn | Polish SMB scheduling | No voice agent, no on-chain deposits |
| Smith.ai | private | Voice answering for SMB | Human-staffed, $325/mo+, English-only |
| ElevenLabs | $11B | Voice AI infra | They sell tools; we sell outcomes |

## 18. References & Sources

- [Phone2 — True Cost of Missed Calls](https://www.phone2.io/post/true-cost-of-missed-calls)
- [Solana × Google Cloud Pay.sh launch](https://www.banklesstimes.com/articles/2026/05/06/solana-and-google-cloud-launch-pay-sh-for-ai-agent-micropayments/)
- [Western Union USDPT on Solana](https://www.businesswire.com/news/home/20260504531737/en/)
- [ElevenLabs $500M raise at $11B](https://techcrunch.com/2026/02/04/elevenlabs-raises-500m-from-sequioia-at-an-11-billion-valuation/)
- [SuperTeam Poland Frontier Tracks](https://superteam.fun/earn/listing/superteam-poland)
- [PKO BP Let's Fintech track](https://superteam.fun/earn/listing/superteam-poland-and-pko-bp)
- [Polish KSeF e-invoicing mandate](https://polishtax.com/information/polish-tax-law/issuance-of-the-invoices/)
- [Colosseum 2024 Investments and Themes](https://blog.colosseum.com/colosseums-2024-investments-and-themes-for-2025/)

---

**Document status:** Living. Update as scope/timeline shifts.
**Last updated:** 2026-05-07
**Owners:** PM (vision sections), Tech lead (technical sections)
