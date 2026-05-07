# ARCHITECTURE

> **MVP architecture** for VoiceDesk — a voice agent that talks directly to Solana, with **Solana as the database** and a generalized **lock-and-release deposit primitive** that works across hotels, car rentals, ski rentals, restaurants, dental clinics, salons, and more.

---

## 1. Core idea

The MVP is intentionally **two boxes plus a wallet**:

```
[ Customer ] ←─voice─→ [ AI Voice Agent ] ←─reads + writes─→ [ Solana ]
                                                                 ▲
                                                                 │
                                       [ Customer Wallet ]──signs deposit
```

There is **no separate database**, **no SMS layer**, **no fiat onramp** in the MVP. The voice agent's tools call Solana RPC directly. Solana holds **all state** — businesses, services, bookings, escrows, attendance, refunds. The customer wallet (Phantom or Privy embedded) signs the deposit transaction.

This is the simplest architecture that still demonstrates the full value: voice-initiated, on-chain, lock-and-release deposits.

---

## 2. The universal deposit primitive

Most service businesses share the same operational pattern:

1. **Customer commits** to a service (booking, reservation, rental).
2. **Business holds collateral** (deposit, card-on-file, security bond) against:
   - No-show / cancellation
   - Damage / loss
   - Late return
   - Overage charges
3. **At end of service**, deposit is either:
   - **Released** (full refund — happy path)
   - **Partially claimed** (damages, late fee, partial use)
   - **Fully claimed** (no-show, total loss)

VoiceDesk implements this as a single Anchor primitive — `Booking + EscrowPDA` — that all verticals reuse.

```
create_booking(business, customer, deposit, service_window)
   ↓
[Escrow PDA holds deposit]
   ↓
   ├─ release_full(booking_id)        → 100% to customer (happy path)
   ├─ release_partial(booking_id, %)  → split customer/business (damages)
   ├─ claim_full(booking_id)          → 100% to business (no-show / total loss)
   └─ customer_cancel(booking_id)     → tiered refund based on timing
```

That's it. Every vertical is just **different parameters** on the same primitive.

---

## 3. Vertical applications (same primitive, different parameters)

| Vertical | Deposit | Service window | Release trigger | Claim trigger |
|---|---|---|---|---|
| **Hotel booking** | 1 night equivalent | check-in → check-out | Check-out scan + no damage report | Damage report / early-departure penalty |
| **Car rental** | 500–2000 PLN | pickup → return | Return + clean inspection | Damage / late return / fuel charge |
| **Ski rental** | 200–800 PLN | rental → return | Equipment returned undamaged | Damage / loss / late return |
| **Restaurant reservation** | 30–100 PLN/seat | reservation time | Attendance confirmation | No-show after 30 min |
| **Dental / medical appointment** | 50–200 PLN | appointment time | Attendance confirmation | No-show after grace |
| **Salon / barber** | 30–100 PLN | appointment time | Attendance confirmation | No-show after grace |
| **Equipment rental (general)** | item-dependent | rental period | Return undamaged | Damage / non-return |
| **Coworking / studio booking** | hourly rate | booking window | Check-in confirmation | No-show |

The voice agent picks the **vertical config** at conversation start (based on which business it represents) and uses the same on-chain primitive underneath.

---

## 4. Architecture diagram (MVP)

```
┌──────────────────────────────────────────────────────────────────┐
│  CUSTOMER                                                        │
│  Talks via browser widget OR phone (ElevenLabs Twilio number)    │
└────────────────────────┬─────────────────────────────────────────┘
                         │ voice
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  ELEVENLABS CONVERSATIONAL AI                                    │
│  - Polish-language agent with vertical-specific persona          │
│  - Tool calls → Solana RPC                                       │
└────────────────────────┬─────────────────────────────────────────┘
                         │ tool: check_availability / create_booking
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  THIN BRIDGE (FastAPI, ~200 lines)                               │
│  - Receives ElevenLabs tool webhooks                             │
│  - Calls Solana via solana-py / Anchor IDL                       │
│  - Returns result to ElevenLabs (synchronous)                    │
│  - Generates Solana Pay deeplink for deposit                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │ reads + builds tx
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  SOLANA (= the entire database)                                  │
│                                                                  │
│  Anchor program holds:                                           │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │ Business PDA     │  │ Booking PDA     │  │ Escrow PDA   │   │
│  │ - name           │  │ - business      │  │ - deposit    │   │
│  │ - vertical       │  │ - customer      │  │ - locked at  │   │
│  │ - services       │  │ - deposit       │  │              │   │
│  │ - deposit_policy │  │ - service_start │  └──────────────┘   │
│  │ - oracle_pubkey  │  │ - service_end   │                     │
│  └──────────────────┘  │ - status        │                     │
│                        └─────────────────┘                     │
└────────────────────────┬─────────────────────────────────────────┘
                         ▲
                         │ signs deposit tx
                         │
┌──────────────────────────────────────────────────────────────────┐
│  CUSTOMER WALLET                                                 │
│  - Phantom (default for MVP)                                     │
│  - Privy embedded (post-MVP for non-crypto users)                │
└──────────────────────────────────────────────────────────────────┘
```

**That's the entire MVP stack.** Three boxes plus a wallet. No Postgres, no SMS, no onramp, no KSeF, no Twilio (browser widget version), no microservices.

---

## 5. Why "Solana as the database" works for MVP

| Concern | Traditional answer | Why Solana works here |
|---|---|---|
| **Read latency** | Postgres index ~1ms | Solana RPC ~50–200ms — fine for human voice (we're already at 800ms latency floor) |
| **Write cost** | Free (DB) | ~0.000005 SOL per booking — negligible |
| **Schema flexibility** | ALTER TABLE | Anchor IDL versioning + state migrations (acceptable for MVP) |
| **Querying** | SQL | Account discriminator + memcmp filter (Anchor RPC) — sufficient for "list bookings for business X" |
| **Search** | Full-text / pgvector | N/A for MVP (we don't need fuzzy search of bookings) |
| **Backup** | Snapshots | Solana ledger = canonical record |
| **Data ownership** | Centralized | Customer + business both verifiable on-chain — primary feature, not bug |

**When we'd add a database (post-MVP):** RAG over business FAQ, call recordings, conversation analytics, GDPR data retention controls.

---

## 6. End-to-end flow — Hotel example

### 6.1 Booking
```
Customer (browser): "Chcę zarezerwować pokój w Hotelu Polonia na piątek-niedzielę"
Agent: "Pokój jednoosobowy lub dwuosobowy?"
Customer: "Dwuosobowy"
Agent: [tool: check_availability(hotel_pubkey, friday, sunday, "double")]
       → returns: 2 rooms available, 350 PLN/night, deposit 350 PLN
Agent: "Mam pokój za 350 zł za noc, łącznie 700 zł, wymagamy depozytu 350 zł.
        Mogę zarezerwować?"
Customer: "Tak"
Agent: [tool: create_booking_intent(hotel, dates, customer_phone, deposit=350 PLN)]
       → returns: { booking_id, solana_pay_url }
Agent: "Otrzymasz na ekranie link do depozytu. Po zapłaceniu rezerwacja jest potwierdzona."
```

### 6.2 Deposit lock
```
[Customer clicks Solana Pay link in browser widget]
   ↓
[Phantom or Privy signs tx]
   ↓
[Anchor program: lock_deposit(booking_id, 350 PLN ≈ 87.5 USDC)]
   ↓
[Escrow PDA holds 87.5 USDC]
   ↓
[Booking status: PendingPayment → Confirmed]
```

### 6.3 Service window (Friday → Sunday)
- Hotel can see booking in their dashboard
- Booking is final, customer cannot reclaim deposit unilaterally

### 6.4 Checkout (Sunday)
**Happy path:**
```
[Hotel staff confirms checkout via dashboard OR voice agent ("klient się wymeldował, brak szkód")]
   ↓
[Anchor: release_full(booking_id)]
   ↓
[87.5 USDC → customer wallet]
   ↓
[Booking status: Confirmed → Released]
```

**Damage path:**
```
[Hotel files damage claim: "uszkodzony stolik, 200 PLN"]
   ↓
[Anchor: release_partial(booking_id, customer_share=37.5%)]
   ↓
[32.8 USDC → customer, 54.7 USDC → hotel]
```

**No-show path:**
```
[24h after check-in date with no checkin event]
   ↓
[Anchor: claim_full(booking_id)]
   ↓
[87.5 USDC → hotel (95%) + protocol fee (5%)]
```

---

## 7. Smart contract (Anchor) account model

### 7.1 Business
```rust
pub struct Business {
    pub owner: Pubkey,                 // SMB wallet
    pub vertical: Vertical,             // Hotel | CarRental | SkiRental | ...
    pub name: String,                   // "Hotel Polonia"
    pub deposit_policy: DepositPolicy,  // % of service price, fixed amount, etc.
    pub cancellation_policy: u8,        // hours before service for full refund
    pub oracle_pubkey: Pubkey,          // backend signer (for ticket receipts)
    pub bond_balance: u64,              // optional SMB bond for x402 fees (future)
}
```

### 7.2 Booking
```rust
pub struct Booking {
    pub booking_id: [u8; 32],
    pub business: Pubkey,
    pub customer: Pubkey,
    pub deposit: u64,                   // USDC lamports
    pub service_start: i64,             // unix timestamp
    pub service_end: i64,
    pub status: BookingStatus,          // Pending | Confirmed | Released | Claimed | Disputed
    pub vertical_metadata: Vec<u8>,     // serialized vertical-specific data
}
```

### 7.3 Escrow PDA
- Per-booking PDA owned by the program
- Holds USDC SPL tokens
- Seeds: `["escrow", booking_id]`

### 7.4 Vertical
```rust
pub enum Vertical {
    Hotel,
    CarRental,
    SkiRental,
    EquipmentRental,
    Restaurant,
    Dental,
    Salon,
    Coworking,
    Other,
}
```

### 7.5 Status
```rust
pub enum BookingStatus {
    Pending,        // intent created, deposit not yet paid
    Confirmed,      // deposit locked
    Released,       // happy path, full refund
    PartiallyReleased, // damages claimed
    Claimed,        // full forfeit
    CustomerCancelled,
    Disputed,
}
```

---

## 8. Instructions (Anchor program)

| Instruction | Caller | Purpose |
|---|---|---|
| `create_business` | SMB wallet | Onboard a new business (vertical + policy) |
| `update_business` | SMB wallet | Edit deposit policy, services |
| `create_booking_intent` | Backend (off-chain) | Reserve a booking_id, return Solana Pay link |
| `lock_deposit` | Customer wallet | Customer signs to deposit USDC into escrow |
| `confirm_attendance` | SMB wallet | Service consumed, release full deposit |
| `release_partial` | SMB wallet | Service consumed with damages — split |
| `claim_full` | SMB wallet | No-show / total loss after grace period |
| `customer_cancel` | Customer wallet | Cancellation refund (tiered by timing) |
| `raise_dispute` | Either party | Move booking to Disputed state |
| `resolve_dispute` | Admin (MVP) / DAO (future) | Manual arbitration |

---

## 9. What we explicitly removed for MVP

| Removed | Why | When we add it back |
|---|---|---|
| **Twilio phone integration** | Browser widget demos better, no PSTN cost, no tunneling pain | After hackathon if customers ask for phone |
| **SMS deposit links** | Browser flow shows link in same UI as voice agent | When we add Twilio phone path |
| **Postgres / Supabase** | Solana stores everything we need for MVP | When we add RAG, recordings, GDPR retention |
| **Mercuryo / fiat onramp** | Phantom users have USDC; demo doesn't need PLN→USDC step | When we onboard non-crypto users at scale |
| **Privy embedded wallets** | Phantom is fine for hackathon judges + crypto-native demo audience | When we target Polish dentists' actual customers |
| **KSeF live integration** | Mock invoice generator covers compliance pitch | Q3 2026 when we sign first paying SMB |
| **x402 micropayment per ticket** | Adds complexity; deposit primitive alone is the demo | Phase 2 — bond + per-resolved-call settlement |
| **FastAPI heavy backend with judge / oracle / RAG** | Replaced by ~200-line bridge + direct Solana calls | When we add SLA enforcement and ticket settlement |
| **Multiple route groups (admin)** | Admin can be a CLI for hackathon | When we have actual disputes |
| **Realtime Supabase channels** | Polling Solana on the dashboard is fine for MVP | When we have >10 concurrent SMBs |

This list is the **scope discipline document**. If anyone proposes adding one back during the hackathon, the burden of proof is on them.

---

## 10. Repo layout (simplified MVP)

```
AI_Voice_Agent/
├── README.md
├── compose.dev.yml                    ← runs everything in one command
├── .env.example
│
├── programs/voicedesk/                ← Rust + Anchor (the heart of the MVP)
│   └── src/
│       ├── lib.rs
│       ├── state/
│       │   ├── business.rs
│       │   ├── booking.rs
│       │   └── escrow.rs              ← PDA logic
│       └── instructions/
│           ├── create_business.rs
│           ├── create_booking_intent.rs
│           ├── lock_deposit.rs
│           ├── confirm_attendance.rs
│           ├── release_partial.rs
│           ├── claim_full.rs
│           └── customer_cancel.rs
│
├── tests/                             ← Anchor TS integration tests
│
├── app/                               ← Next.js 14 (browser voice widget + SMB dash)
│   ├── (public)/                      ← customer voice widget + payment
│   ├── (writer)/                      ← SMB dashboard (confirm / claim / view)
│   └── (admin)/                       ← optional, can be CLI
│
├── ai_engine/                         ← Python FastAPI (THIN bridge only)
│   ├── main.py                        ← ~200 lines: ElevenLabs webhooks → Solana
│   ├── solana_client.py               ← Anchor IDL bindings
│   ├── voice_agent/
│   │   └── personas/
│   │       ├── hotel_pl.md
│   │       ├── car_rental_pl.md
│   │       ├── ski_rental_pl.md
│   │       ├── restaurant_pl.md
│   │       ├── dental_pl.md
│   │       └── salon_pl.md
│   └── tests/
│
└── documentation/
    ├── README.md
    ├── PROJECT_OVERVIEW.md
    ├── CLAUDE.md
    └── ARCHITECTURE.md                ← you are here
```

---

## 11. Why this MVP wins the hackathon

1. **Demo simplicity:** Voice → on-chain transaction → release. Three steps, all visible.
2. **Universal use case:** Hotels, car rentals, ski rentals, restaurants, salons — judges instantly see the breadth.
3. **Solana is load-bearing:** Without on-chain escrow, the deposit primitive doesn't work — no Web2 equivalent gives both parties a verifiable, programmatic, neutral lock-and-release.
4. **ElevenLabs is load-bearing:** Booking-by-conversation is the UX; replace voice with text and you're just another booking site.
5. **Polish flavor:** Polish-language agents, mountain ski rentals, Polish hotel network, Polish dental clinics — natural CEE expansion story.
6. **Generalizable post-hackathon:** Add x402 ticket settlement, KSeF, Privy onboarding, multi-language — each is an additive layer, not a rewrite.

---

## 12. Future architecture (post-hackathon)

Once the MVP is shipped and validated, the architecture grows in the following layers (add only what real customers ask for):

```
                    Phase 1 (MVP — what we ship May 11)
                    ────────────────────────────────────
                    Voice → Solana (deposit primitive)

                    Phase 2 (Q3 2026)
                    ─────────────────
                    + Twilio phone integration
                    + Privy embedded wallets
                    + Mercuryo BLIK→USDC onramp

                    Phase 3 (Q4 2026)
                    ─────────────────
                    + x402 per-resolved-ticket micropayments
                    + KSeF live invoice integration
                    + Postgres for analytics / GDPR retention
                    + Multi-language (CZ, SK, HU, DE)

                    Phase 4 (Q1 2027)
                    ─────────────────
                    + Reputation NFTs (verifiable business track records)
                    + DAO governance over fee tiers
                    + Cross-chain expansion (via Wormhole)
                    + White-label SDK
```

Each phase is independently shippable. The MVP ships as a complete product — just narrower in scope.

---

**Document status:** Living. Update as MVP scope shifts during the sprint.
**Last updated:** 2026-05-07
**Owners:** Tech lead (technical sections), PM (vertical strategy)
