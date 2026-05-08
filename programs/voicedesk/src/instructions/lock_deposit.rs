use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus};

#[derive(Accounts)]
pub struct LockDeposit<'info> {
    /// The Booking being funded. Must currently be in Pending status.
    #[account(
        mut,
        seeds = [Booking::SEED_PREFIX, booking.booking_id.as_ref()],
        bump = booking.bump,
    )]
    pub booking: Account<'info, Booking>,

    /// Customer signing and paying the deposit. Must match `booking.customer`.
    #[account(
        mut,
        constraint = customer.key() == booking.customer @ VoiceDeskError::UnauthorizedCustomer,
    )]
    pub customer: Signer<'info>,

    /// Customer's USDC token account (source).
    #[account(
        mut,
        constraint = customer_token_account.owner == customer.key(),
        constraint = customer_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    /// Per-booking escrow token account, created by the client (associated token
    /// account of the escrow PDA authority). Holds the locked USDC.
    #[account(
        mut,
        constraint = escrow_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
        constraint = escrow_token_account.owner == escrow_authority.key(),
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA that owns the escrow token account.
    /// Seeds: ["escrow", booking_id]
    #[account(
        seeds = [Booking::ESCROW_SEED_PREFIX, booking.booking_id.as_ref()],
        bump,
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<LockDeposit>) -> Result<()> {
    let booking = &mut ctx.accounts.booking;

    require!(
        booking.status == BookingStatus::Pending,
        VoiceDeskError::BookingNotPending
    );

    // Transfer deposit from customer → escrow token account.
    let cpi_accounts = Transfer {
        from: ctx.accounts.customer_token_account.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.customer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, booking.deposit_amount)?;

    booking.status = BookingStatus::Confirmed;

    msg!(
        "Deposit locked: {} USDC base units in escrow for booking {:?}",
        booking.deposit_amount,
        booking.booking_id
    );
    Ok(())
}
