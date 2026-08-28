"""HTTP client for Groq.com vision (OpenAI-compatible chat completions)."""

from __future__ import annotations

import base64
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

        mime = guess_image_mime_type(image_bytes)
        encoded = base64.b64encode(image_bytes).decode("ascii")
        image_url = f"data:{mime};base64,{encoded}"

        content: list[dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_url}},
        ]
        for label, crop_bytes in extra_images or []:
            if not crop_bytes or len(crop_bytes) > _MAX_BASE64_IMAGE_BYTES:
                continue
            crop_mime = guess_image_mime_type(crop_bytes)
            crop_b64 = base64.b64encode(crop_bytes).decode("ascii")
            content.append({"type": "text", "text": f"Crop for {label}:"})
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
            "max_completion_tokens": 4096,
            "reasoning_format": "hidden",
            "reasoning_effort": "none",
        }

        url = f"{self._api_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        logger.info(
            "Groq vision request model=%s mime=%s image_bytes=%s",
            self._model,
            mime,
            len(image_bytes),
        )

        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise VisionApiError("Groq vision request timed out") from exc
        except httpx.HTTPError as exc:
            raise VisionApiError(f"Groq vision request failed: {exc}") from exc

        if response.status_code in (401, 403):
            logger.warning("Groq API auth error %s: %s", response.status_code, response.text[:500])
            raise VisionApiError(
                f"Groq API authentication failed (HTTP {response.status_code})",
                status_code=response.status_code,
            )
        if response.status_code == 429:
            logger.warning("Groq API rate limit: %s", response.text[:500])
            raise VisionApiError(
                "Groq API rate limit exceeded (HTTP 429)",
                status_code=429,
            )
        if response.status_code >= 400:
            logger.warning(
                "Groq API error model=%s status=%s body=%s",
                self._model,
                response.status_code,
                response.text[:500],
            )
            detail = response.text[:200]
            if response.status_code == 404 or "model_not_found" in detail:
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
