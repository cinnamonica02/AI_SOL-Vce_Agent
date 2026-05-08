use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VoiceDeskError;
use crate::state::{Booking, BookingStatus, Business};

#[derive(Accounts)]
pub struct CustomerCancel<'info> {
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

    /// Customer cancelling — must match booking.customer.
    #[account(
        constraint = customer.key() == booking.customer @ VoiceDeskError::UnauthorizedCustomer,
    )]
    pub customer: Signer<'info>,

    #[account(
        mut,
        constraint = customer_token_account.owner == booking.customer,
        constraint = customer_token_account.mint == usdc_mint.key() @ VoiceDeskError::InvalidTokenMint,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

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

pub fn handler(ctx: Context<CustomerCancel>) -> Result<()> {
    let booking = &mut ctx.accounts.booking;
    let business = &ctx.accounts.business;

    require!(
        booking.status == BookingStatus::Confirmed,
        VoiceDeskError::BookingNotConfirmed
    );

    let now = Clock::get()?.unix_timestamp;
    require!(
        now < booking.service_start,
        VoiceDeskError::CannotCancelAfterServiceStart
    );

    let cancellation_threshold = booking
        .service_start
        .checked_sub((business.cancellation_hours as i64).saturating_mul(3600))
        .ok_or(VoiceDeskError::ArithmeticOverflow)?;

    let total = ctx.accounts.escrow_token_account.amount;

    let booking_id = booking.booking_id;
    let escrow_bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        Booking::ESCROW_SEED_PREFIX,
        booking_id.as_ref(),
        &[escrow_bump],
    ]];

    if now <= cancellation_threshold {
        // Full refund — cancellation policy met.
        let cpi = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.customer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi,
            signer_seeds,
        );
        token::transfer(cpi_ctx, total)?;

        booking.status = BookingStatus::CustomerCancelled;
        msg!("Customer cancelled (full refund): {}", total);
    } else {
        // Late cancellation: 50% to customer, 50% to business.
        let customer_amount = total / 2;
        let business_amount = total
            .checked_sub(customer_amount)
            .ok_or(VoiceDeskError::ArithmeticOverflow)?;

        if customer_amount > 0 {
            let cpi = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.customer_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi,
                signer_seeds,
            );
            token::transfer(cpi_ctx, customer_amount)?;
        }

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

        booking.status = BookingStatus::LateCancelled;
        msg!(
            "Customer cancelled late: customer {} / business {}",
            customer_amount,
            business_amount
        );
    }

    Ok(())
}
