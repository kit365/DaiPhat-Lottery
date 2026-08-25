"""Shared structured extraction models for LLM vision ticket scan (Grok/Gemini)."""

from __future__ import annotations

import json
import re

from pydantic import BaseModel, Field, ValidationError


class VisionClientError(Exception):
    """Base error for vision LLM clients."""


class VisionConfigurationError(VisionClientError):
    """Missing API key or base URL."""


class VisionApiError(VisionClientError):
    """Remote API returned an error or unusable response."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class TicketBBox(BaseModel):
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0


class TicketExtraction(BaseModel):
    stationName: str | None = None
    stationCode: str | None = None
    serialNumber: str | None = None
    numbers: str | None = None
    drawDate: str | None = None
    # Printed ticket price/denomination (prefer digits; service formats for display).
    ticketType: str | None = None
    # Production batch code printed by the issuer (NOT system import-batch code).
    batchCode: str | None = None
    fieldConfidences: dict[str, float] = Field(default_factory=dict)
    bbox: TicketBBox | None = None
    # Per-field boxes in the same image space as ticket bbox.
    fieldBoxes: dict[str, TicketBBox] = Field(default_factory=dict)


class ScanExtractionResult(BaseModel):
    tickets: list[TicketExtraction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


_JSON_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def strip_json_fence(text: str) -> str:
    match = _JSON_BLOCK_PATTERN.search(text.strip())
    if match:
        return match.group(1).strip()
    return text.strip()


def parse_scan_extraction_json(content: str) -> ScanExtractionResult:
    raw = strip_json_fence(content)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VisionApiError(f"Vision response is not valid JSON: {exc}") from exc

    if isinstance(payload, dict) and "tickets" not in payload and "data" in payload:
        payload = payload["data"]

    try:
        return ScanExtractionResult.model_validate(payload)
    except ValidationError as exc:
        raise VisionApiError(f"Vision JSON does not match expected schema: {exc}") from exc


def guess_image_mime_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if image_bytes.startswith(b"RIFF") and len(image_bytes) > 12 and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def format_price_vnd(raw: str | None) -> str | None:
    """Normalize printed price to a readable VND string, e.g. 10000 → '10.000 VND'."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw.strip())
    if not digits:
        cleaned = raw.strip()
        return cleaned or None
    try:
        amount = int(digits)
    except ValueError:
        return raw.strip()
    grouped = f"{amount:,}".replace(",", ".")
    return f"{grouped} VND"


def build_ticket_extraction_prompt(
    stations_json: str,
    max_tickets: int,
    image_width: int,
    image_height: int,
) -> str:
    return f"""You are a lottery ticket OCR assistant for Vietnamese lottery tickets (vé số kiến thiết).

Analyze the uploaded image and extract ticket information. Rules:
- Only extract values clearly visible in the image. Do NOT guess or invent data.
- Tickets may overlap or cover each other. Still detect EVERY distinct ticket you can see.
- For each detected ticket, extract every field independently. If some fields are covered/obscured by another ticket, set ONLY those fields to null with low fieldConfidences (0.0-0.2). Keep and return the ticket with all readable fields.
- Never omit a ticket from "tickets" just because some fields are unreadable.
- If a field is unreadable or uncertain, set it to null and use a low fieldConfidences value (0.0-0.4).
- Add a short warning when fields look covered by overlap (e.g. "Ticket #2 serial may be covered by another ticket").
- Return at most {max_tickets} ticket(s).
- Image size: {image_width}x{image_height} pixels. All bbox / fieldBoxes coordinates are in this image space (x,y = top-left).
- Prefer matching station names/codes against this active station list: {stations_json}
- numbers: digits only, no spaces or punctuation.
- drawDate: ISO format YYYY-MM-DD when visible. If the date is not clearly readable, use null (do not invent or emit non-ISO strings).
- serialNumber: alphanumeric ticket serial as printed.
- ticketType: printed ticket PRICE as digits when possible (e.g. "10000"), not a product category.
- batchCode: production batch code printed by the lottery issuer/manufacturer on the ticket (NOT a warehouse import-batch code). Null if not visible.
- fieldConfidences must include stationName, serialNumber, numbers, drawDate, ticketType, and batchCode (0.0-1.0).
- fieldBoxes: for each non-null field above, provide a tight bounding box around that printed value inside the ticket. Omit boxes for null/unreadable fields.
- Also provide ticket-level bbox around the whole ticket region (even when some fields are missing).

Respond with ONLY valid JSON (no markdown prose) matching this schema:
{{
  "tickets": [
    {{
      "stationName": string | null,
      "stationCode": string | null,
      "serialNumber": string | null,
      "numbers": string | null,
      "drawDate": string | null,
      "ticketType": string | null,
      "batchCode": string | null,
      "fieldConfidences": {{
        "stationName": number,
        "serialNumber": number,
        "numbers": number,
        "drawDate": number,
        "ticketType": number,
        "batchCode": number
      }},
      "bbox": {{ "x": int, "y": int, "width": int, "height": int }} | null,
      "fieldBoxes": {{
        "stationName": {{ "x": int, "y": int, "width": int, "height": int }},
        "serialNumber": {{ "x": int, "y": int, "width": int, "height": int }},
        "numbers": {{ "x": int, "y": int, "width": int, "height": int }},
        "drawDate": {{ "x": int, "y": int, "width": int, "height": int }},
        "ticketType": {{ "x": int, "y": int, "width": int, "height": int }},
        "batchCode": {{ "x": int, "y": int, "width": int, "height": int }}
      }}
    }}
  ],
  "warnings": [string]
}}
"""
