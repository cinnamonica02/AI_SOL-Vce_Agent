use anchor_lang::prelude::*;

/// Vertical determines deposit semantics (UI-only — all verticals use the
/// same on-chain primitive). Stored to surface in dashboards and logs.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq, Debug)]
pub enum Vertical {
    #[default]
    Other,
    Hotel,
    CarRental,
    SkiRental,
    EquipmentRental,
    Restaurant,
    Dental,
    Salon,
    Coworking,
}

/// A Business represents an SMB onboarded onto VoiceDesk.
///
/// PDA seeds: ["business", owner.key()]
/// One business per wallet (MVP). Multi-business per wallet is Phase 2+.
#[account]
pub struct Business {
    /// Wallet that controls this business (signs confirm_attendance, claim_full, etc.)
    pub owner: Pubkey,
    /// Vertical category (informational; deposit logic is universal)
    pub vertical: Vertical,
    /// Display name (max 64 bytes)
    pub name: String,
    /// Default deposit amount in USDC base units (6 decimals).
    /// e.g. 50_000_000 = 50.00 USDC.
    pub default_deposit_amount: u64,
    /// Hours before service start during which a customer can fully cancel.
    /// 1..=720 (1 hour to 30 days).
    pub cancellation_hours: u32,
    /// PDA bump
    pub bump: u8,
}

impl Business {
    /// Maximum length of `name` field.
    pub const MAX_NAME_LEN: usize = 64;

    /// Account size in bytes (Anchor discriminator + all fields).
    /// Discriminator (8) + Pubkey (32) + Vertical (1) + name length-prefix (4)
    /// + name bytes (MAX_NAME_LEN) + u64 (8) + u32 (4) + u8 (1) = 122
    pub const SPACE: usize = 8 + 32 + 1 + 4 + Self::MAX_NAME_LEN + 8 + 4 + 1;

    pub const SEED_PREFIX: &'static [u8] = b"business";
}
