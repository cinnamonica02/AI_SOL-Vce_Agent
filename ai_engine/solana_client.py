"""
Solana client — thin wrapper around anchorpy for the VoiceDesk program.

Day 1: stub. Day 2+: real Anchor instruction dispatchers.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

# from anchorpy import Idl, Program, Provider, Wallet
# from solana.rpc.async_api import AsyncClient
# from solders.keypair import Keypair


RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID = os.getenv("ANCHOR_PROGRAM_ID", "")
IDL_PATH = Path(__file__).parent / "idl" / "voicedesk.json"


# ─────────────────────────────────────────────────────────────────
#  TODO Day 2: load IDL + create Program instance
# ─────────────────────────────────────────────────────────────────
# async def get_program() -> Program:
#     client = AsyncClient(RPC_URL)
#     wallet = Wallet(Keypair.from_seed(...))
#     provider = Provider(client, wallet)
#     idl = Idl.from_json(IDL_PATH.read_text())
#     return Program(idl, PublicKey(PROGRAM_ID), provider)


# ─────────────────────────────────────────────────────────────────
#  TODO Day 2: instruction dispatchers
# ─────────────────────────────────────────────────────────────────
# async def create_business(...)
# async def create_booking_intent(...)
# async def lock_deposit(...)
# async def confirm_attendance(...)
# async def claim_full(...)
# async def customer_cancel(...)


def health_check() -> dict[str, Any]:
    """Sanity check used by tests and the bridge startup."""
    return {
        "rpc_url": RPC_URL,
        "program_id": PROGRAM_ID or "(not deployed yet)",
        "idl_exists": IDL_PATH.exists(),
    }
