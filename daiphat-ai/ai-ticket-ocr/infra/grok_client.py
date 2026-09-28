"""HTTP client for Grok/xAI vision (OpenAI-compatible chat completions)."""

from __future__ import annotations

import base64
from typing import Any

import httpx

from infra.config import settings
from infra.logger import logger
from infra.vision_extraction import (
    ScanExtractionResult,
    VisionApiError,
    VisionClientError,
    VisionConfigurationError,
    guess_image_mime_type,
    parse_scan_extraction_json,
)

# Backward-compatible aliases for existing imports/tests.
GrokClientError = VisionClientError
GrokConfigurationError = VisionConfigurationError
GrokApiError = VisionApiError
GrokScanExtractionResult = ScanExtractionResult

# Legacy type aliases used by older tests/imports.
from infra.vision_extraction import TicketBBox as GrokBBox  # noqa: E402
from infra.vision_extraction import TicketExtraction as GrokTicketExtraction  # noqa: E402


class GrokVisionClient:
    """Calls external Grok vision API with one image + structured JSON prompt."""

    def __init__(
        self,
        *,
        api_base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self._api_base_url = (api_base_url or settings.GROK_API_BASE_URL or "").rstrip("/")
        self._api_key = api_key or settings.GROK_API_KEY or ""
        self._model = model or settings.GROK_VISION_MODEL
        self._timeout = timeout_seconds or settings.GROK_READ_TIMEOUT_SECONDS

    def _ensure_configured(self) -> None:
        if not self._api_base_url:
            raise VisionConfigurationError(
                "GROK_API_BASE_URL is not configured for ticket vision Grok engine."
            )
        if not self._api_key:
            raise VisionConfigurationError(
                "GROK_API_KEY is not configured for ticket vision Grok engine."
            )

    def analyze_ticket_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        extra_images: list[tuple[str, bytes]] | None = None,
    ) -> ScanExtractionResult:
        self._ensure_configured()
        mime = guess_image_mime_type(image_bytes)
        encoded = base64.b64encode(image_bytes).decode("ascii")
        image_url = f"data:{mime};base64,{encoded}"

        content: list[dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_url}},
        ]
        for label, crop_bytes in extra_images or []:
            if not crop_bytes:
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

        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {
                    "role": "user",
                    "content": content,
                }
            ],
            "temperature": 0,
        }

        url = f"{self._api_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise VisionApiError("Grok vision request timed out") from exc
        except httpx.HTTPError as exc:
            raise VisionApiError(f"Grok vision request failed: {exc}") from exc

        if response.status_code >= 400:
            logger.warning("Grok API error %s: %s", response.status_code, response.text[:500])
            raise VisionApiError(
                f"Grok API returned HTTP {response.status_code}",
                status_code=response.status_code,
            )

        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise VisionApiError("Grok API response missing message content") from exc

        if not isinstance(content, str) or not content.strip():
            raise VisionApiError("Grok API returned empty content")

        return parse_scan_extraction_json(content)
