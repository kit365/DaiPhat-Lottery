"""HTTP client for Groq.com vision (OpenAI-compatible chat completions)."""

from __future__ import annotations

import base64
import re
import time
from typing import Any

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
# Ticket JSON rarely needs 4k tokens; lower reservation reduces OTPM 429s.
_MAX_COMPLETION_TOKENS = 2048
_RATE_LIMIT_RETRIES = 2
_RETRY_AFTER_PATTERN = re.compile(r"try again in ([0-9]+(?:\.[0-9]+)?)s", re.IGNORECASE)
# qwen/qwen3.6-27b: "This model supports up to 3 images"
_MAX_IMAGES_PER_REQUEST = 3
_MAX_EXTRA_IMAGES = _MAX_IMAGES_PER_REQUEST - 1


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

        # Current Groq vision model is qwen/qwen3.6-27b (Llama-4 Scout removed).
        # JSON mode requires reasoning_format parsed|hidden; hide reasoning so
        # message.content stays parseable ticket JSON.
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
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
            "reasoning_format": "hidden",
            "reasoning_effort": "none",
        }

        url = f"{self._api_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        logger.info(
            "Groq vision request model=%s mime=%s image_bytes=%s extras=%s",
            self._model,
            mime,
            len(image_bytes),
            len(extras),
        )

        response = self._post_with_rate_limit_retry(url, headers, payload)
        return self._parse_success_response(response)
    def _post_with_rate_limit_retry(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
    ) -> httpx.Response:
        last_429_body = ""
        for attempt in range(_RATE_LIMIT_RETRIES + 1):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    response = client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise VisionApiError("Groq vision request timed out") from exc
            except httpx.HTTPError as exc:
                raise VisionApiError(f"Groq vision request failed: {exc}") from exc

            if response.status_code != 429:
                self._raise_for_http_error(response)
                return response

            last_429_body = response.text[:500]
            logger.warning(
                "Groq API rate limit (attempt %s/%s): %s",
                attempt + 1,
                _RATE_LIMIT_RETRIES + 1,
                last_429_body,
            )
            if attempt >= _RATE_LIMIT_RETRIES:
                break
            wait_seconds = _parse_retry_after_seconds(last_429_body) or (5.0 * (attempt + 1))
            # Cap wait so Admin UI does not hang for minutes on OTPM limits.
            wait_seconds = min(max(wait_seconds, 1.0), 20.0)
            logger.info("Waiting %.1fs before Groq retry", wait_seconds)
            time.sleep(wait_seconds)

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
                or "tokens" in detail_lower
                and "requested" in detail_lower
            ):
                raise VisionApiError(
                    "Groq request too large for input token budget (ITPM). "
                    "Reduce image size or crop count.",
                    status_code=response.status_code,
                )
            if response.status_code == 404 or "model_not_found" in detail_lower:
                raise VisionApiError(
                    f"Groq vision model '{self._model}' is unavailable. "
                    "Set GROQ_VISION_MODEL to a current vision model "
                    "(e.g. qwen/qwen3.6-27b).",
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


def _is_request_too_large(exc: VisionApiError) -> bool:
    detail = str(exc).lower()
    status = getattr(exc, "status_code", None)
    return status == 413 or "too large" in detail or "itpm" in detail
