use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus, Business};

#[derive(Accounts)]
pub struct ClaimFull<'info> {
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

    /// Business token account — receives 95% of the deposit.
    #[account(
        mut,
        constraint = business_token_account.owner == business.owner,
        constraint = business_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub business_token_account: Account<'info, TokenAccount>,

    /// Protocol treasury token account — receives 5% protocol fee.
    /// (For MVP this is a fixed wallet's USDC ATA, passed by the client.)
    #[account(
        mut,
        constraint = treasury_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

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

pub fn handler(ctx: Context<ClaimFull>) -> Result<()> {
    let booking = &mut ctx.accounts.booking;

    require!(
        booking.status == BookingStatus::Confirmed,
        VoiceDeskError::BookingNotConfirmed
    );

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= booking
            .service_end
            .checked_add(Booking::NO_SHOW_GRACE_SECONDS)
            .ok_or(VoiceDeskError::ArithmeticOverflow)?,
        VoiceDeskError::NoShowGraceNotElapsed
    );

    let total = ctx.accounts.escrow_token_account.amount;

    // protocol_fee = total * PROTOCOL_FEE_BPS / 10_000
    let protocol_fee = (total as u128)
        .checked_mul(Booking::PROTOCOL_FEE_BPS as u128)
        .ok_or(VoiceDeskError::ArithmeticOverflow)?
        .checked_div(Booking::BPS_DENOMINATOR as u128)
        .ok_or(VoiceDeskError::ArithmeticOverflow)? as u64;
    let business_amount = total
        .checked_sub(protocol_fee)
        .ok_or(VoiceDeskError::ArithmeticOverflow)?;

    let booking_id = booking.booking_id;
    let escrow_bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        Booking::ESCROW_SEED_PREFIX,
        booking_id.as_ref(),
        &[escrow_bump],
    ]];

    // Business gets 95%
    if business_amount > 0 {
        let cpi = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.business_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi,
            signer_seeds,
        );
        token::transfer(cpi_ctx, business_amount)?;
    }

    // Treasury gets 5%
    if protocol_fee > 0 {
        let cpi = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi,
            signer_seeds,
        );
        token::transfer(cpi_ctx, protocol_fee)?;
    }

    booking.status = BookingStatus::Claimed;

    msg!(
        "No-show claimed: business {} / treasury {}",
        business_amount,
        protocol_fee
    );
    Ok(())
}
