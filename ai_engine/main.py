"""
VoiceDesk AI Engine — thin FastAPI bridge.

Receives tool-call webhooks from ElevenLabs Conversational AI and
translates them into Solana Anchor program instructions.

Day 1 smoke test endpoint: POST /webhook/elevenlabs receives any tool
call, logs it, and returns a stub response. Once Anchor program is
deployed, these handlers become real RPC calls.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    return HealthResponse(status="ok", service="voicedesk-ai-engine", version="0.1.0")


@app.post("/webhook/elevenlabs", response_model=ToolCallResponse)
async def elevenlabs_webhook(request: Request) -> ToolCallResponse:
    """
    Generic ElevenLabs Conversational AI tool-call receiver.

    Day 1 stub: logs the payload and returns a confirmation.
    Day 2+: dispatches to specific Solana instructions.
    """
    payload = await request.json()
    log.info("ElevenLabs tool call received: %s", payload)

    tool_name = payload.get("tool_name") or payload.get("name") or "unknown"

    # ─── Day 1: smoke test ──────────────────────────────────────
    if tool_name == "hello_world":
        return ToolCallResponse(
            status="ok",
            message="Cześć! Bridge działa. Tool call dotarł do FastAPI.",
            data={"tool": tool_name, "received": True},
        )

    # ─── Day 2+: real tools (TODO) ──────────────────────────────
    # if tool_name == "check_availability":
    #     return await tools.check_availability(payload)
    # if tool_name == "create_booking_intent":
    #     return await tools.create_booking_intent(payload)
    # if tool_name == "get_booking_status":
    #     return await tools.get_booking_status(payload)

    log.warning("Unknown tool: %s", tool_name)
    raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "VoiceDesk AI Engine",
        "docs": "/docs",
        "health": "/health",
        "webhook": "/webhook/elevenlabs",
    }
