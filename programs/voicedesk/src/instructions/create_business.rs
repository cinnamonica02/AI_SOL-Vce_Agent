use anchor_lang::prelude::*;

use crate::errors::VoiceDeskError;
use crate::state::{Business, Vertical};

#[derive(Accounts)]
pub struct CreateBusiness<'info> {
    /// The Business PDA being created.
    /// Seeds: ["business", owner.key()]
    #[account(
        init,
        payer = owner,
        space = Business::SPACE,
        seeds = [Business::SEED_PREFIX, owner.key().as_ref()],
        bump
    )]
    pub business: Account<'info, Business>,

    /// SMB owner — pays for account creation and becomes the authoritative signer.
    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateBusiness>,
    vertical: Vertical,
    name: String,
    default_deposit_amount: u64,
    cancellation_hours: u32,
) -> Result<()> {
    require!(
        !name.is_empty() && name.len() <= Business::MAX_NAME_LEN,
        VoiceDeskError::InvalidBusinessName
    );
    require!(
        default_deposit_amount > 0,
        VoiceDeskError::InvalidDepositAmount
    );
    require!(
        (1..=720).contains(&cancellation_hours),
        VoiceDeskError::InvalidCancellationPolicy
    );

    let business = &mut ctx.accounts.business;
    business.owner = ctx.accounts.owner.key();
    business.vertical = vertical;
    business.name = name;
    business.default_deposit_amount = default_deposit_amount;
    business.cancellation_hours = cancellation_hours;
    business.bump = ctx.bumps.business;

    msg!(
        "Business created: {} (vertical: {:?})",
        business.name,
        business.vertical
    );
    Ok(())
}
