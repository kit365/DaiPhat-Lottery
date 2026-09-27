"""HTTP client for Groq.com vision (OpenAI-compatible chat completions)."""

from __future__ import annotations

import base64
import contextvars
import re
import time
from contextlib import contextmanager
from threading import Lock, Semaphore
from typing import Any, Iterator

import httpx

from infra.config import settings
from infra.logger import logger
from infra.vision_extraction import (
    ScanExtractionResult,
    VisionApiError,
    VisionConfigurationError,
    guess_image_mime_type,
    parse_scan_extraction_json,
)

# Groq base64 image payloads are capped (docs: ~4MB). Ticket-vision already
# resizes uploads, but reject oversized payloads early with a clear error.
_MAX_BASE64_IMAGE_BYTES = 4 * 1024 * 1024
# Free/on_demand OTPM for qwen3.8-27b is often 1000 — never request more.
_MAX_COMPLETION_TOKENS = 640
_MAX_COMPLETION_TOKENS_COLLAGE = 900
_OTPM_SAFE_CEILING = 1000
# Transient RPM/ITPM/TPM: honor Retry-After up to a bounded wait, then fail
# soft so legacy OCR can run. Daily TPD never retries.
_RATE_LIMIT_RETRIES = 3
_RETRY_AFTER_PATTERN = re.compile(r"try again in ([0-9]+(?:\.[0-9]+)?)s", re.IGNORECASE)
_MAX_RATE_LIMIT_WAIT_SECONDS = 28.0
# qwen/qwen3.8-27b: docs allow at most 3 images per request
_MAX_IMAGES_PER_REQUEST = 3
_MAX_EXTRA_IMAGES = _MAX_IMAGES_PER_REQUEST - 1

# When Legacy already produced a result, do not burn Admin latency on ITPM waits.
_fail_fast_rate_limit: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "groq_fail_fast_rate_limit",
    default=False,
)


@contextmanager
def fail_fast_rate_limits(enabled: bool = True) -> Iterator[None]:
    """Context: on ITPM/TPM 429, raise immediately (caller keeps Legacy OCR)."""
    token = _fail_fast_rate_limit.set(bool(enabled))
    try:
        yield
    finally:
        _fail_fast_rate_limit.reset(token)

# Reuse keep-alive connections across per-ticket / batched OCR calls.
_http_clients: dict[float, httpx.Client] = {}
_http_clients_lock = Lock()
# Serialize Groq calls: free-tier ITPM (~7000) cannot absorb 3×~4800 parallel.
_groq_gate_lock = Lock()
_groq_gate: Semaphore | None = None
_groq_gate_limit: int = 0


def _groq_concurrency() -> int:
    try:
        return max(1, int(getattr(settings, "TICKET_VISION_GROQ_MAX_CONCURRENT", 1) or 1))
    except (TypeError, ValueError):
        return 1


def _acquire_groq_slot() -> Semaphore:
    """Process-wide gate so parallel ticket OCR cannot stampede ITPM/TPM."""
    global _groq_gate, _groq_gate_limit
    limit = _groq_concurrency()
    with _groq_gate_lock:
        if _groq_gate is None or _groq_gate_limit != limit:
            _groq_gate = Semaphore(limit)
            _groq_gate_limit = limit
        return _groq_gate


def _shared_http_client(timeout_seconds: float) -> httpx.Client:
    with _http_clients_lock:
        client = _http_clients.get(timeout_seconds)
        if client is None or client.is_closed:
            client = httpx.Client(
                timeout=timeout_seconds,
                limits=httpx.Limits(
                    max_connections=6,
                    max_keepalive_connections=4,
                ),
            )
            _http_clients[timeout_seconds] = client
        return client


class GroqVisionClient:
    """Calls Groq vision API with one image + structured JSON prompt."""

    def __init__(
        self,
        *,
        api_base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self._api_base_url = (api_base_url or settings.GROQ_API_BASE_URL or "").rstrip("/")
        self._api_key = api_key or settings.GROQ_API_KEY or ""
        self._model = model or settings.GROQ_VISION_MODEL
        self._timeout = timeout_seconds or settings.GROQ_READ_TIMEOUT_SECONDS

    def _ensure_configured(self) -> None:
        if not self._api_base_url:
            raise VisionConfigurationError(
                "GROQ_API_BASE_URL is not configured for ticket vision Groq engine."
            )
        if not self._api_key:
            raise VisionConfigurationError(
                "GROQ_API_KEY is not configured for ticket vision Groq engine."
            )

    def analyze_ticket_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        extra_images: list[tuple[str, bytes]] | None = None,
    ) -> ScanExtractionResult:
        self._ensure_configured()
        if not image_bytes:
            raise VisionApiError("Groq vision received empty image bytes")
        if len(image_bytes) > _MAX_BASE64_IMAGE_BYTES:
            raise VisionApiError(
                f"Image exceeds Groq base64 size limit ({_MAX_BASE64_IMAGE_BYTES} bytes)."
            )

        extras = list(extra_images or [])
        if len(extras) > _MAX_EXTRA_IMAGES:
            logger.warning(
                "Truncating Groq extra images from %s to %s (model max total=%s)",
                len(extras),
                _MAX_EXTRA_IMAGES,
                _MAX_IMAGES_PER_REQUEST,
            )
            extras = extras[:_MAX_EXTRA_IMAGES]

        # Shrink payload on ITPM / request-too-large (common on free tier).
        attempt_extras = [extras, extras[:1], []]
        last_error: VisionApiError | None = None
        seen: set[int] = set()
        gate = _acquire_groq_slot()
        gate.acquire()
        try:
            for candidate in attempt_extras:
                key = len(candidate)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    return self._analyze_once(image_bytes, prompt, candidate)
                except VisionApiError as exc:
                    last_error = exc
                    if not _is_request_too_large(exc):
                        raise
                    logger.warning(
                        "Groq request too large with %s extra image(s); retrying smaller payload",
                        key,
                    )
        finally:
            gate.release()
        assert last_error is not None
        raise last_error

    def _analyze_once(
        self,
        image_bytes: bytes,
        prompt: str,
        extras: list[tuple[str, bytes]],
    ) -> ScanExtractionResult:
        mime = guess_image_mime_type(image_bytes)
        encoded = base64.b64encode(image_bytes).decode("ascii")
        image_url = f"data:{mime};base64,{encoded}"

        content: list[dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_url}},
        ]
        for label, crop_bytes in extras:
            if not crop_bytes or len(crop_bytes) > _MAX_BASE64_IMAGE_BYTES:
                continue
            crop_mime = guess_image_mime_type(crop_bytes)
            crop_b64 = base64.b64encode(crop_bytes).decode("ascii")
            # Keep crop label short — long labels waste ITPM on free tier.
            short_label = label.split(":", 1)[-1][:40]
            content.append({"type": "text", "text": f"Crop ({short_label}):"})
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{crop_mime};base64,{crop_b64}"},
                }
            )

        # Stay under on_demand OTPM (often 1000). Collage needs more output.
        max_tokens = (
            _MAX_COMPLETION_TOKENS_COLLAGE
            if "COLLAGE MODE" in (prompt or "")
            else _MAX_COMPLETION_TOKENS
        )
        max_tokens = min(max_tokens, _OTPM_SAFE_CEILING - 1)

        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {
                    "role": "user",
                    "content": content,
                }
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "max_completion_tokens": max_tokens,
            "reasoning_format": "hidden",
            "reasoning_effort": "none",
        }

        url = f"{self._api_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        logger.info(
            "Groq vision request model=%s mime=%s image_bytes=%s extras=%s max_tokens=%s",
            self._model,
            mime,
            len(image_bytes),
            len(extras),
            max_tokens,
        )

        response = self._post_with_rate_limit_retry(url, headers, payload)
        return self._parse_success_response(response)

    def _post_with_rate_limit_retry(
        self,
        url: str,
        headers: dict[str, Any],
        payload: dict[str, Any],
    ) -> httpx.Response:
        from infra import llm_circuit  # noqa: PLC0415 -- avoid import cycle at module load

        last_429_body = ""
        for attempt in range(_RATE_LIMIT_RETRIES + 1):
            try:
                client = _shared_http_client(self._timeout)
                response = client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise VisionApiError("Groq vision request timed out") from exc
            except httpx.HTTPError as exc:
                raise VisionApiError(f"Groq vision request failed: {exc}") from exc

            if response.status_code != 429:
                self._raise_for_http_error(response)
                return response

            last_429_body = response.text[:800]
            logger.warning(
                "Groq API rate limit (attempt %s/%s): %s",
                attempt + 1,
                _RATE_LIMIT_RETRIES + 1,
                last_429_body[:500],
            )

            # Daily token / org quota: retrying burns the BE budget.
            if llm_circuit.looks_like_quota_exhaustion(last_429_body):
                llm_circuit.trip("Groq token/quota exhausted (TPD)")
                raise VisionApiError(
                    "Groq API quota/token limit exceeded (HTTP 429)",
                    status_code=429,
                )

            # OTPM: requested max_tokens > org OTPM ceiling — shrink and retry now.
            if _looks_like_otpm_budget(last_429_body):
                current = int(payload.get("max_completion_tokens") or _MAX_COMPLETION_TOKENS)
                reduced = _reduce_max_tokens_for_otpm(last_429_body, current)
                if reduced < current:
                    logger.warning(
                        "Groq OTPM budget: lowering max_completion_tokens %s → %s",
                        current,
                        reduced,
                    )
                    payload["max_completion_tokens"] = reduced
                    continue
                # Already at floor — treat as soft rate limit below.

            # Legacy-first boost: keep the local OCR result instead of waiting
            # 20–40s for ITPM to refill (Admin upload latency).
            if _fail_fast_rate_limit.get():
                soft_seconds = llm_circuit.soft_cooldown_seconds()
                llm_circuit.trip(
                    "Groq ITPM/TPM rate limit (fail-fast boost)",
                    seconds=soft_seconds,
                )
                logger.warning(
                    "Groq fail-fast: returning to caller without Retry-After wait "
                    "(legacy OCR result should be kept)"
                )
                raise VisionApiError(
                    "Groq API rate limit exceeded (HTTP 429)",
                    status_code=429,
                )

            if attempt >= _RATE_LIMIT_RETRIES:
                break

            wait_seconds = _parse_retry_after_seconds(last_429_body) or (2.0 * (attempt + 1))
            # ITPM/TPM often needs 20–40s; honor up to the soft cap so we do not
            # burn retries with 8s waits that still fail and trip a 15min circuit.
            wait_seconds = min(max(wait_seconds, 1.0), _MAX_RATE_LIMIT_WAIT_SECONDS)
            logger.info("Waiting %.1fs before Groq retry", wait_seconds)
            time.sleep(wait_seconds)

        # Transient ITPM/TPM — short soft cooldown, not a 15-minute blackout.
        soft_seconds = llm_circuit.soft_cooldown_seconds()
        llm_circuit.trip(
            "Groq ITPM/TPM rate limit after retries",
            seconds=soft_seconds,
        )
        raise VisionApiError(
            "Groq API rate limit exceeded (HTTP 429)",
            status_code=429,
        )

    def _raise_for_http_error(self, response: httpx.Response) -> None:
        if response.status_code in (401, 403):
            logger.warning("Groq API auth error %s: %s", response.status_code, response.text[:500])
            raise VisionApiError(
                f"Groq API authentication failed (HTTP {response.status_code})",
                status_code=response.status_code,
            )
        if response.status_code >= 400:
            logger.warning(
                "Groq API error model=%s status=%s body=%s",
                self._model,
                response.status_code,
                response.text[:500],
            )
            detail = response.text[:400]
            detail_lower = detail.lower()
            if "too many images" in detail_lower:
                raise VisionApiError(
                    "Groq vision model accepts at most 3 images per request "
                    "(full ticket + up to 2 crops).",
                    status_code=response.status_code,
                )
            if (
                response.status_code == 413
                or "request too large" in detail_lower
                or ("tokens" in detail_lower and "requested" in detail_lower)
            ):
                raise VisionApiError(
                    "Groq request too large for input token budget (ITPM). "
                    "Reduce image size or crop count.",
                    status_code=response.status_code,
                )
            if response.status_code == 404 or "model_not_found" in detail_lower:
                raise VisionApiError(
                    f"Groq vision model '{self._model}' is unavailable. "
                    "Set GROQ_VISION_MODEL to a model your Groq account can access "
                    "(e.g. qwen/qwen3.8-27b).",
                    status_code=response.status_code,
                )
            if (
                "model_decommissioned" in detail_lower
                or "has been decommissioned" in detail_lower
            ):
                raise VisionApiError(
                    f"Groq vision model '{self._model}' has been decommissioned. "
                    "Update GROQ_VISION_MODEL (e.g. qwen/qwen3.8-27b).",
                    status_code=response.status_code,
                )
            raise VisionApiError(
                f"Groq API returned HTTP {response.status_code}",
                status_code=response.status_code,
            )

    def _parse_success_response(self, response: httpx.Response) -> ScanExtractionResult:
        try:
            body = response.json()
            message = body["choices"][0]["message"]
            content = message.get("content")
        except (KeyError, IndexError, TypeError) as exc:
            raise VisionApiError("Groq API response missing message content") from exc

        if not isinstance(content, str) or not content.strip():
            # Some reasoning models may leave content empty when malformed;
            # never invent ticket fields — soft-fail upstream.
            raise VisionApiError("Groq API returned empty content")

        logger.info(
            "Groq vision response model=%s content_chars=%s",
            self._model,
            len(content),
        )
        return parse_scan_extraction_json(content)


def _parse_retry_after_seconds(error_body: str) -> float | None:
    match = _RETRY_AFTER_PATTERN.search(error_body or "")
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _looks_like_otpm_budget(error_body: str) -> bool:
    text = (error_body or "").lower()
    return (
        "output tokens per minute" in text
        or "(otpm)" in text
        or "expected output tokens exceed" in text
        or "reduce max_tokens" in text
    )


def _reduce_max_tokens_for_otpm(error_body: str, current: int) -> int:
    """Parse 'Limit 1000, Requested 1024' and return a safe completion budget."""
    limit_match = re.search(
        r"limit\s+(\d+).*?requested\s+(\d+)",
        error_body or "",
        re.IGNORECASE | re.DOTALL,
    )
    if limit_match:
        try:
            limit = int(limit_match.group(1))
            return max(256, min(current - 1, limit - 1, _OTPM_SAFE_CEILING - 1))
        except ValueError:
            pass
    return max(256, min(current - 128, _OTPM_SAFE_CEILING - 1))


def _is_request_too_large(exc: VisionApiError) -> bool:
    detail = str(exc).lower()
    status = getattr(exc, "status_code", None)
    return status == 413 or "too large" in detail or "itpm" in detail
