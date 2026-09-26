"""Phase 4 ops: short-circuit cloud LLM after quota / hard rate-limit failures.

When Groq returns a daily token (TPD) exhaustion, every subsequent scan in the
same Admin multi-upload would otherwise wait through long 429 retries again.
Trip this circuit for a cooldown so ticket-vision goes straight to local OCR.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from infra.config import settings
from infra.logger import logger

_lock = threading.Lock()
_open_until: float = 0.0
_last_reason: str = ""


@dataclass(frozen=True)
class LlmCircuitSnapshot:
    open: bool
    remainingSeconds: int
    reason: str


def cooldown_seconds() -> int:
    try:
        return max(0, int(getattr(settings, "TICKET_VISION_LLM_CIRCUIT_COOLDOWN_SECONDS", 900) or 0))
    except (TypeError, ValueError):
        return 900


def soft_cooldown_seconds() -> int:
    """Short cooldown after transient ITPM/TPM — not daily TPD exhaustion."""
    try:
        return max(
            0,
            int(getattr(settings, "TICKET_VISION_LLM_CIRCUIT_SOFT_COOLDOWN_SECONDS", 45) or 0),
        )
    except (TypeError, ValueError):
        return 45


def snapshot() -> LlmCircuitSnapshot:
    with _lock:
        remaining = max(0, int(_open_until - time.monotonic()))
        return LlmCircuitSnapshot(
            open=remaining > 0,
            remainingSeconds=remaining,
            reason=_last_reason if remaining > 0 else "",
        )


def is_open() -> bool:
    return snapshot().open


def trip(reason: str, *, seconds: int | None = None) -> None:
    cooldown = cooldown_seconds() if seconds is None else max(0, int(seconds))
    if cooldown <= 0:
        return
    global _open_until, _last_reason
    with _lock:
        _open_until = time.monotonic() + cooldown
        _last_reason = (reason or "cloud LLM unavailable").strip()[:240]
        logger.warning(
            "LLM circuit OPEN for %ss — subsequent scans skip cloud vision (%s)",
            cooldown,
            _last_reason,
        )


def reset_for_tests() -> None:
    global _open_until, _last_reason
    with _lock:
        _open_until = 0.0
        _last_reason = ""


def looks_like_quota_exhaustion(message: str) -> bool:
    """True for daily/token quota — not transient RPM blips."""
    text = (message or "").lower()
    markers = (
        "tokens per day",
        "token per day",
        "(tpd)",
        "tpd:",
        "daily quota",
        "quota exceeded",
        "insufficient_quota",
        "exceeded your current quota",
        "out of tokens",
        "token quota",
        "organization_quota",
    )
    return any(marker in text for marker in markers)
