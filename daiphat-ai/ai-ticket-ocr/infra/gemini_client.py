"""HTTP client for Google Gemini vision (Generative Language API)."""

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

# Re-export for callers that catch Gemini-named errors.
GeminiClientError = VisionClientError
GeminiConfigurationError = VisionConfigurationError
GeminiApiError = VisionApiError


class GeminiVisionClient:
    """Calls Gemini generateContent with one image + structured JSON prompt."""

    def __init__(
        self,
        *,
        api_base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self._api_base_url = (api_base_url or settings.GEMINI_API_BASE_URL or "").rstrip("/")
        self._api_key = api_key or settings.GEMINI_API_KEY or ""
        self._model = model or settings.GEMINI_VISION_MODEL
        self._timeout = timeout_seconds or settings.GEMINI_READ_TIMEOUT_SECONDS

    def _ensure_configured(self) -> None:
        if not self._api_base_url:
            raise VisionConfigurationError(
                "GEMINI_API_BASE_URL is not configured for ticket vision Gemini engine."
            )
        if not self._api_key:
            raise VisionConfigurationError(
                "GEMINI_API_KEY is not configured for ticket vision Gemini engine."
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

        parts: list[dict[str, Any]] = [
            {"text": prompt},
            {"inline_data": {"mime_type": mime, "data": encoded}},
        ]
        for label, crop_bytes in extra_images or []:
            if not crop_bytes:
                continue
            crop_mime = guess_image_mime_type(crop_bytes)
            crop_b64 = base64.b64encode(crop_bytes).decode("ascii")
            parts.append({"text": f"Crop for {label}:"})
            parts.append({"inline_data": {"mime_type": crop_mime, "data": crop_b64}})

        payload: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
            },
        }

        url = f"{self._api_base_url}/models/{self._model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._api_key,
        }

        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise VisionApiError("Gemini vision request timed out") from exc
        except httpx.HTTPError as exc:
            raise VisionApiError(f"Gemini vision request failed: {exc}") from exc

        if response.status_code >= 400:
            logger.warning("Gemini API error %s: %s", response.status_code, response.text[:500])
            raise VisionApiError(
                f"Gemini API returned HTTP {response.status_code}",
                status_code=response.status_code,
            )

        try:
            body = response.json()
            parts = body["candidates"][0]["content"]["parts"]
            content = "".join(
                part.get("text", "") for part in parts if isinstance(part, dict)
            )
        except (KeyError, IndexError, TypeError) as exc:
            raise VisionApiError("Gemini API response missing message content") from exc

        if not content.strip():
            raise VisionApiError("Gemini API returned empty content")

        return parse_scan_extraction_json(content)
