"""Phase 4: soft daily quota for cloud vision LLM scans.

When the counter reaches ``TICKET_VISION_LLM_DAILY_QUOTA``, scan requests that
would have used Groq/Gemini/Grok are routed straight to local OCR instead of
burning provider tokens (or waiting on 429s). ``0`` disables the cap.

Counter is file-backed so a restart mid-day keeps the same usage (best-effort;
multi-replica needs a shared store).
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

from infra.config import settings
from infra.logger import logger

_lock = threading.Lock()
_override_dir: Path | None = None


@dataclass(frozen=True)
class LlmQuotaSnapshot:
    date: str
    used: int
    limit: int  # 0 = unlimited
    remaining: int | None  # None when unlimited
    exhausted: bool


def _service_root() -> Path:
    # infra/llm_quota.py -> daiphat-ai/ -> services/ticket-vision/
    return Path(__file__).resolve().parents[1] / "services" / "ticket-vision"


def _quota_dir() -> Path:
    if _override_dir is not None:
        return _override_dir
    configured = getattr(settings, "TICKET_VISION_LLM_QUOTA_DIR", "data/llm_quota")
    path = Path(str(configured))
    if path.is_absolute():
        return path
    return _service_root() / path


def _today() -> str:
    return date.today().isoformat()


def _state_path() -> Path:
    return _quota_dir() / f"llm_quota_{_today()}.json"


def _load_unlocked() -> dict:
    path = _state_path()
    if not path.is_file():
        return {"date": _today(), "used": 0}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"date": _today(), "used": 0}
    if data.get("date") != _today():
        return {"date": _today(), "used": 0}
    try:
        used_int = max(0, int(data.get("used", 0)))
    except (TypeError, ValueError):
        used_int = 0
    return {"date": _today(), "used": used_int}


def _save_unlocked(state: dict) -> None:
    path = _state_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "date": state["date"],
            "used": state["used"],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        path.write_text(json.dumps(payload), encoding="utf-8")
    except OSError as exc:
        logger.warning("Could not persist LLM quota state: %s", exc)


def daily_limit() -> int:
    try:
        return max(0, int(getattr(settings, "TICKET_VISION_LLM_DAILY_QUOTA", 0) or 0))
    except (TypeError, ValueError):
        return 0


def snapshot() -> LlmQuotaSnapshot:
    limit = daily_limit()
    with _lock:
        state = _load_unlocked()
        used = int(state["used"])
    if limit <= 0:
        return LlmQuotaSnapshot(date=_today(), used=used, limit=0, remaining=None, exhausted=False)
    remaining = max(0, limit - used)
    return LlmQuotaSnapshot(
        date=_today(),
        used=used,
        limit=limit,
        remaining=remaining,
        exhausted=used >= limit,
    )


def try_consume() -> LlmQuotaSnapshot:
    """Atomically check + increment. Exhausted snapshot means do not call LLM."""
    limit = daily_limit()
    with _lock:
        state = _load_unlocked()
        used = int(state["used"])
        if limit > 0 and used >= limit:
            return LlmQuotaSnapshot(
                date=state["date"],
                used=used,
                limit=limit,
                remaining=0,
                exhausted=True,
            )
        state["used"] = used + 1
        _save_unlocked(state)
        new_used = state["used"]
    if limit <= 0:
        return LlmQuotaSnapshot(date=_today(), used=new_used, limit=0, remaining=None, exhausted=False)
    remaining = max(0, limit - new_used)
    return LlmQuotaSnapshot(
        date=_today(),
        used=new_used,
        limit=limit,
        remaining=remaining,
        exhausted=False,
    )


def set_quota_dir_for_tests(path: Path | None) -> None:
    """Test helper: redirect quota files (None restores default)."""
    global _override_dir
    with _lock:
        _override_dir = path
