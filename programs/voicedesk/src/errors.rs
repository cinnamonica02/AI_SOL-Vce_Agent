use anchor_lang::prelude::*;

#[error_code]
pub enum VoiceDeskError {
    // ─── Business validation ─────────────────────────────────────
    #[msg("Business name must be between 1 and 64 characters")]
    InvalidBusinessName,

    #[msg("Cancellation policy must be between 1 and 720 hours")]
    InvalidCancellationPolicy,

    #[msg("Deposit amount must be greater than zero")]
    InvalidDepositAmount,

    // ─── Booking validation ──────────────────────────────────────
    #[msg("Service start must be in the future")]
    InvalidServiceStart,

    #[msg("Service end must be after service start")]
    InvalidServiceWindow,

    #[msg("Booking is not in Pending status")]
    BookingNotPending,

    #[msg("Booking is not in Confirmed status")]
    BookingNotConfirmed,

    #[msg("Booking has already been finalized")]
    BookingAlreadyFinalized,

    // ─── Auth checks ─────────────────────────────────────────────
    #[msg("Only the business owner can perform this action")]
    UnauthorizedBusinessOwner,

    #[msg("Only the booking customer can perform this action")]
    UnauthorizedCustomer,

    // ─── Timing checks ───────────────────────────────────────────
    #[msg("Cannot claim no-show before grace period has elapsed")]
    NoShowGraceNotElapsed,

    #[msg("Cannot cancel after service has started")]
    CannotCancelAfterServiceStart,

    // ─── Math / split validation ─────────────────────────────────
    #[msg("Customer share must be between 0 and 10000 basis points")]
    InvalidCustomerShare,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    // ─── Token / mint mismatch ───────────────────────────────────
    #[msg("Escrow token mint does not match expected USDC mint")]
    InvalidTokenMint,
}
