//! VoiceDesk — voice-initiated lock-and-release deposit primitive on Solana.
//!
//! The same Anchor program serves all verticals (hotels, car rentals,
//! ski rentals, restaurants, dental, salons, equipment rental, coworking).
//! Vertical-specific behavior lives in the off-chain voice agent persona;
//! on-chain we expose one universal Booking + EscrowPDA primitive.
//!
//! Account flow:
//!   1. SMB calls `create_business` once.
//!   2. Bridge calls `create_booking_intent` per voice-initiated booking.
//!   3. Customer calls `lock_deposit` to fund the per-booking escrow.
//!   4. End-of-service:
//!         - SMB calls `confirm_attendance`     → 100% refund
//!         - SMB calls `release_partial(bps)`   → split for damages
//!         - SMB calls `claim_full`             → no-show forfeit (after grace)
//!         - Customer calls `customer_cancel`   → tiered refund

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::Vertical;

// Replace this placeholder after first `anchor build` with the value of
// `solana address -k target/deploy/voicedesk-keypair.json`.
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod voicedesk {
    use super::*;

    /// Onboard a new SMB.
    pub fn create_business(
        ctx: Context<CreateBusiness>,
        vertical: Vertical,
        name: String,
        default_deposit_amount: u64,
        cancellation_hours: u32,
    ) -> Result<()> {
        instructions::create_business::handler(
            ctx,
            vertical,
            name,
            default_deposit_amount,
            cancellation_hours,
        )
    }

    /// Reserve a booking_id and create the Booking PDA in Pending state.
    /// Called by the bridge after the voice agent confirms an intent.
    pub fn create_booking_intent(
        ctx: Context<CreateBookingIntent>,
        booking_id: [u8; 32],
        deposit_amount: u64,
        service_start: i64,
        service_end: i64,
    ) -> Result<()> {
        instructions::create_booking_intent::handler(
            ctx,
            booking_id,
            deposit_amount,
            service_start,
            service_end,
        )
    }

    /// Customer signs to fund the per-booking escrow with USDC.
    pub fn lock_deposit(ctx: Context<LockDeposit>) -> Result<()> {
        instructions::lock_deposit::handler(ctx)
    }

    /// SMB confirms the customer attended → 100% refund.
    pub fn confirm_attendance(ctx: Context<ConfirmAttendance>) -> Result<()> {
        instructions::confirm_attendance::handler(ctx)
    }

    /// SMB claims partial damages — split escrow by basis points.
    /// `customer_share_bps` 0..=10000 (where 10000 = 100% to customer).
    pub fn release_partial(ctx: Context<ReleasePartial>, customer_share_bps: u16) -> Result<()> {
        instructions::release_partial::handler(ctx, customer_share_bps)
    }

    /// SMB claims a no-show after the grace period.
    /// 95% to business, 5% to protocol treasury.
    pub fn claim_full(ctx: Context<ClaimFull>) -> Result<()> {
        instructions::claim_full::handler(ctx)
    }

    /// Customer cancels — full refund if cancellation policy is met,
    /// 50% refund otherwise. Reverts after service has started.
    pub fn customer_cancel(ctx: Context<CustomerCancel>) -> Result<()> {
        instructions::customer_cancel::handler(ctx)
    }
}
