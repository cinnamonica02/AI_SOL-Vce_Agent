use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus, Business};

#[derive(Accounts)]
pub struct ReleasePartial<'info> {
    #[account(
        mut,
        seeds = [Booking::SEED_PREFIX, booking.booking_id.as_ref()],
        bump = booking.bump,
        constraint = booking.business == business.key(),
    )]
    pub booking: Account<'info, Booking>,

    #[account(
        seeds = [Business::SEED_PREFIX, business.owner.as_ref()],
        bump = business.bump,
    )]
    pub business: Account<'info, Business>,

    #[account(
        constraint = business_owner.key() == business.owner @ VoiceDeskError::UnauthorizedBusinessOwner,
    )]
    pub business_owner: Signer<'info>,

    /// Customer's token account (gets the customer's share back).
    #[account(
        mut,
        constraint = customer_token_account.owner == booking.customer,
        constraint = customer_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    /// Business's token account (gets the damages share).
    #[account(
        mut,
        constraint = business_token_account.owner == business.owner,
        constraint = business_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub business_token_account: Account<'info, TokenAccount>,

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

pub fn handler(ctx: Context<ReleasePartial>, customer_share_bps: u16) -> Result<()> {
    let booking = &mut ctx.accounts.booking;

    require!(
        booking.status == BookingStatus::Confirmed,
        VoiceDeskError::BookingNotConfirmed
    );
    require!(
        customer_share_bps as u64 <= Booking::BPS_DENOMINATOR,
        VoiceDeskError::InvalidCustomerShare
    );

    let total = ctx.accounts.escrow_token_account.amount;

    // customer_amount = total * customer_share_bps / 10_000
    let customer_amount = (total as u128)
        .checked_mul(customer_share_bps as u128)
        .ok_or(VoiceDeskError::ArithmeticOverflow)?
        .checked_div(Booking::BPS_DENOMINATOR as u128)
        .ok_or(VoiceDeskError::ArithmeticOverflow)? as u64;
    let business_amount = total
        .checked_sub(customer_amount)
        .ok_or(VoiceDeskError::ArithmeticOverflow)?;

    let booking_id = booking.booking_id;
    let escrow_bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        Booking::ESCROW_SEED_PREFIX,
        booking_id.as_ref(),
        &[escrow_bump],
    ]];

    // Customer share
    if customer_amount > 0 {
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
        token::transfer(cpi_ctx, customer_amount)?;
    }

    // Business share
    if business_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.business_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, business_amount)?;
    }

    booking.status = BookingStatus::PartiallyReleased;

    msg!(
        "Partial release: customer {} / business {} (bps split: {})",
        customer_amount,
        business_amount,
        customer_share_bps
    );
    Ok(())
}
