use anchor_lang::prelude::*;

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus, Business};

#[derive(Accounts)]
#[instruction(booking_id: [u8; 32])]
pub struct CreateBookingIntent<'info> {
    /// The Booking PDA being created.
    /// Seeds: ["booking", booking_id]
    #[account(
        init,
        payer = payer,
        space = Booking::SPACE,
        seeds = [Booking::SEED_PREFIX, booking_id.as_ref()],
        bump
    )]
    pub booking: Account<'info, Booking>,

    /// The Business this booking belongs to.
    #[account(
        seeds = [Business::SEED_PREFIX, business.owner.as_ref()],
        bump = business.bump,
    )]
    pub business: Account<'info, Business>,

    /// CHECK: customer wallet — does NOT need to sign here. The customer signs
    /// later via `lock_deposit`. This lets the bridge create intents without
    /// requiring the customer's signature upfront.
    pub customer: AccountInfo<'info>,

    /// The wallet paying for account creation. Usually the bridge's wallet
    /// or the SMB owner.
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateBookingIntent>,
    booking_id: [u8; 32],
    deposit_amount: u64,
    service_start: i64,
    service_end: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(deposit_amount > 0, VoiceDeskError::InvalidDepositAmount);
    require!(service_start > now, VoiceDeskError::InvalidServiceStart);
    require!(
        service_end > service_start,
        VoiceDeskError::InvalidServiceWindow
    );

    let booking = &mut ctx.accounts.booking;
    booking.booking_id = booking_id;
    booking.business = ctx.accounts.business.key();
    booking.customer = ctx.accounts.customer.key();
    booking.deposit_amount = deposit_amount;
    booking.service_start = service_start;
    booking.service_end = service_end;
    booking.status = BookingStatus::Pending;
    booking.created_at = now;
    booking.bump = ctx.bumps.booking;

    msg!(
        "Booking intent created: {} USDC base units, service {} → {}",
        booking.deposit_amount,
        booking.service_start,
        booking.service_end
    );
    Ok(())
}
