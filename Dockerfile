# ─────────────────────────────────────────────────────────────────
#  VoiceDesk AI Engine — FastAPI thin bridge
#
#  Builds the Python service that bridges ElevenLabs Conversational AI
#  tool webhooks to the Solana Anchor program.
# ─────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and force unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.8.2 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

# System deps: build tools for any wheels that compile from source
# (solana-py + anchorpy pull in cryptography which sometimes builds from source)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install "poetry==${POETRY_VERSION}"

WORKDIR /app

# Copy only dependency manifests first (better layer caching)
COPY ai_engine/pyproject.toml ai_engine/poetry.lock* /app/

# Install dependencies (no project install yet — code mounted at runtime in dev)
RUN poetry install --no-root --no-ansi

# Copy source (overlaid by volume mount in compose.dev.yml during dev)
COPY ai_engine/ /app/

EXPOSE 8000

# Default command: hot-reload uvicorn for development.
# Override in production with --workers N --no-reload.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
