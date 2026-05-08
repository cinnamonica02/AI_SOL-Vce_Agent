use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus, Business};

#[derive(Accounts)]
pub struct ConfirmAttendance<'info> {
    /// The Booking — must currently be Confirmed.
    #[account(
        mut,
        seeds = [Booking::SEED_PREFIX, booking.booking_id.as_ref()],
        bump = booking.bump,
        constraint = booking.business == business.key(),
    )]
    pub booking: Account<'info, Booking>,

    /// The Business owning this booking.
    #[account(
        seeds = [Business::SEED_PREFIX, business.owner.as_ref()],
        bump = business.bump,
    )]
    pub business: Account<'info, Business>,

    /// Business owner — must match `business.owner`.
    #[account(
        constraint = business_owner.key() == business.owner @ VoiceDeskError::UnauthorizedBusinessOwner,
    )]
    pub business_owner: Signer<'info>,

    /// Customer's USDC token account (refund destination).
    #[account(
        mut,
        constraint = customer_token_account.owner == booking.customer,
        constraint = customer_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    /// Per-booking escrow token account.
    #[account(
        mut,
        constraint = escrow_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
        constraint = escrow_token_account.owner == escrow_authority.key(),
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority over the escrow token account.
    #[account(
        seeds = [Booking::ESCROW_SEED_PREFIX, booking.booking_id.as_ref()],
        bump,
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ConfirmAttendance>) -> Result<()> {
    let booking = &mut ctx.accounts.booking;

    require!(
        booking.status == BookingStatus::Confirmed,
        VoiceDeskError::BookingNotConfirmed
    );

    let amount = ctx.accounts.escrow_token_account.amount;

    // Transfer 100% from escrow → customer (signed by escrow PDA authority).
    let booking_id = booking.booking_id;
    let escrow_bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        Booking::ESCROW_SEED_PREFIX,
        booking_id.as_ref(),
        &[escrow_bump],
    ]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.customer_token_account.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    booking.status = BookingStatus::Released;

    msg!(
        "Attendance confirmed: {} USDC base units refunded to customer",
        amount
    );
    Ok(())
}
