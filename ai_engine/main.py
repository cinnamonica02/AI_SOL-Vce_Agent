"""
VoiceDesk AI Engine — thin FastAPI bridge.

Receives ElevenLabs Conversational AI tool-call webhooks and dispatches
them to the corresponding Solana Anchor program instructions via
`solana_client.py`.

Endpoints:
  GET  /health                        liveness + Solana config check
  GET  /                              service banner
  POST /webhook/elevenlabs            tool-call dispatcher
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solana_client import (
    check_availability,
    create_booking_intent,
    get_booking_status,
    health_check,
)

# ─────────────────────────────────────────────────────────────────
#  Logging
# ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=os.getenv("API_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("voicedesk")


# ─────────────────────────────────────────────────────────────────
#  App
# ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="VoiceDesk AI Engine",
    description="Bridge between ElevenLabs Conversational AI and Solana",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────
#  Models
# ─────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    solana: dict[str, Any]


class ToolCallResponse(BaseModel):
    """Generic envelope returned to ElevenLabs Conversational AI."""

    status: str
    message: str
    data: dict[str, Any] | None = None


# ─────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe used by docker compose healthcheck."""
    return HealthResponse(
        status="ok",
        service="voicedesk-ai-engine",
        version="0.1.0",
        solana=health_check(),
    )


@app.post("/webhook/elevenlabs", response_model=ToolCallResponse)
async def elevenlabs_webhook(request: Request) -> ToolCallResponse:
    """
    ElevenLabs Conversational AI tool-call dispatcher.

    Expected payload shape (per ElevenLabs Conversational AI tool spec):
        {
          "tool_name": "create_booking_intent",
          "parameters": { ... tool-specific args ... }
        }
    """
    payload = await request.json()
    log.info("ElevenLabs tool call: %s", payload)

    tool_name = payload.get("tool_name") or payload.get("name") or "unknown"
    params = payload.get("parameters") or payload.get("args") or {}

    try:
        # ─── Smoke test ─────────────────────────────────────────
        if tool_name == "hello_world":
            return ToolCallResponse(
                status="ok",
                message="Cześć! Bridge działa. Tool call dotarł do FastAPI.",
                data={"tool": tool_name, "received": True},
            )

        # ─── Read-only tools ────────────────────────────────────
        if tool_name == "check_availability":
            data = await check_availability(**params)
            return ToolCallResponse(
                status="ok",
                message=f"Found business: {data.get('name')}",
                data=data,
            )

        if tool_name == "get_booking_status":
            data = await get_booking_status(**params)
            return ToolCallResponse(
                status="ok",
                message=f"Booking status: {data.get('status')}",
                data=data,
            )

        # ─── Write tools (submit on-chain tx) ───────────────────
        if tool_name == "create_booking_intent":
            result = await create_booking_intent(**params)
            return ToolCallResponse(
                status="ok",
                message=(
                    f"Rezerwacja utworzona. Otrzymasz link do depozytu "
                    f"({result.deposit_amount / 1_000_000:.2f} USDC)."
                ),
                data={
                    "booking_id": result.booking_id_hex,
                    "booking_pda": result.booking_pda,
                    "deposit_amount": result.deposit_amount,
                    "payment_url": result.payment_url,
                },
            )

        log.warning("Unknown tool: %s", tool_name)
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")

    except FileNotFoundError as e:
        # IDL missing — bridge needs `anchor build` to have run
        log.error("Bridge not ready: %s", e)
        raise HTTPException(
            status_code=503,
            detail=f"Bridge not ready (run `anchor build` first): {e}",
        )
    except Exception as e:
        log.exception("Tool call failed: %s", tool_name)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "VoiceDesk AI Engine",
        "docs": "/docs",
        "health": "/health",
        "webhook": "/webhook/elevenlabs",
    }
