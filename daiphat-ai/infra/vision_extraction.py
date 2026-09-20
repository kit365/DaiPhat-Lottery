"""Shared structured extraction models for LLM vision ticket scan (Groq/Gemini/Grok)."""

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
    # Float so vision models can return either pixel ints or normalized 0..1.
    x: float = 0
    y: float = 0
    width: float = 0
    height: float = 0


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
    # fieldName -> ocr_field_layouts.id that produced the recognized value.
    usedFieldLayouts: dict[str, int] = Field(default_factory=dict)


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


_TICKET_INDEX_PATTERN = re.compile(r"ticket\s*#?\s*(\d+)", re.IGNORECASE)
_EN_FIELD_HINTS = (
    ("serial", "số seri"),
    ("number", "dãy số"),
    ("station", "tên đài"),
    ("date", "ngày quay"),
    ("price", "mệnh giá"),
    ("batch", "mã lô"),
)


def localize_scan_warnings(warnings: list[str] | None) -> list[str]:
    """Map English LLM soft-warnings into actionable Vietnamese Admin copy."""
    if not warnings:
        return []
    localized: list[str] = []
    seen: set[str] = set()
    for raw in warnings:
        if not raw or not str(raw).strip():
            continue
        text = str(raw).strip()
        mapped = _localize_one_warning(text)
        if mapped not in seen:
            seen.add(mapped)
            localized.append(mapped)
    return localized


def _localize_one_warning(text: str) -> str:
    lower = text.lower()
    # Already Vietnamese — keep as-is.
    if re.search(r"[àáạảãâăèéêìíòóôơùúýđ]", lower) or re.search(
        r"\b(vé|seri|dãy số|chụp|quét lại|thủ công|tải lại)\b", lower
    ):
        return text

    ticket_match = _TICKET_INDEX_PATTERN.search(text)
    ticket_label = f"Vé #{ticket_match.group(1)}" if ticket_match else "Một vé trong ảnh"

    field_vi = None
    for en, vi in _EN_FIELD_HINTS:
        if en in lower:
            field_vi = vi
            break

    covered = any(
        token in lower
        for token in ("cover", "obscur", "overlap", "hidden", "not clearly", "unreadable", "blur")
    )
    if covered and field_vi:
        return (
            f"{ticket_label}: {field_vi} bị che hoặc không rõ. "
            f"Hãy tách các vé chồng nhau hoặc chụp lại gần hơn, rồi quét lại."
        )
    if covered:
        return (
            f"{ticket_label}: một số thông tin bị che hoặc không rõ. "
            f"Hãy tách vé / chỉnh góc chụp rồi quét lại."
        )
    if "no ticket" in lower or "not detect" in lower:
        return (
            "Không phát hiện được vé trong ảnh. "
            "Vui lòng chụp rõ toàn bộ tờ vé (đủ ánh sáng, không bị cắt) rồi quét lại."
        )
    if "rate limit" in lower or "too many" in lower:
        return text  # FE / router already maps provider limits
    # Generic English leftover
    if re.search(r"[A-Za-z]{4,}", text):
        return (
            f"{ticket_label}: nhận diện chưa đầy đủ. "
            f"Vui lòng kiểm tra ảnh hoặc nhập thủ công các trường còn thiếu."
        )
    return text


def build_ticket_extraction_prompt(
    stations_json: str,
    max_tickets: int,
    image_width: int,
    image_height: int,
    field_layouts_hint: str | None = None,
) -> str:
    layout_section = ""
    if field_layouts_hint:
        layout_section = f"""
- Template field layout guidance (pixel ROIs on this image). Prefer reading these fields from the indicated regions; still verify against the full ticket image.
  When the same fieldName appears more than once, try the lowest priority number first (priority 1 = primary).
  Only use a higher priority region if the primary read is null, unreadable, or low-confidence.
  In usedFieldLayouts, record the layout id that ultimately produced each field value.
{field_layouts_hint}
- Extra crop images (when provided) are zooms of those regions — use them to improve accuracy for the named fields. Do NOT invent values that are not visible.
"""

    return f"""You are a lottery ticket OCR assistant for Vietnamese lottery tickets (vé số kiến thiết).

Analyze the uploaded image and extract ticket information. Rules:
- Only extract values clearly visible in the image. Do NOT guess or invent data.
- Tickets may overlap or cover each other. Still detect EVERY distinct ticket you can see.
- For each detected ticket, extract every field independently. If some fields are covered/obscured by another ticket, set ONLY those fields to null with low fieldConfidences (0.0-0.2). Keep and return the ticket with all readable fields.
- Never omit a ticket from "tickets" just because some fields are unreadable.
- If a field is unreadable or uncertain, set it to null and use a low fieldConfidences value (0.0-0.4).
- Add a short Vietnamese warning when fields look covered/obscured, including what to do next
  (e.g. "Vé #2: số seri bị che — hãy tách vé hoặc chụp lại góc nghiêng để thấy rõ seri.").
  Warnings MUST be in Vietnamese for Admin operators. Do not write English warnings.
- Return at most {max_tickets} ticket(s).
- Image size: {image_width}x{image_height} pixels.
- All bbox / fieldBoxes MUST use this full-frame coordinate space (x,y = top-left of the whole image — NOT relative to a ticket crop or extra crop image).
- Prefer NORMALIZED coordinates in [0.0, 1.0] (fraction of full image width/height). Absolute pixel coordinates in the {image_width}x{image_height} space are also accepted.
- List tickets in reading order: top-to-bottom, then left-to-right.
- Prefer matching station names/codes against this active station list: {stations_json}
- numbers: digits only, no spaces or punctuation.
- drawDate: ISO format YYYY-MM-DD when visible. If the date is not clearly readable, use null (do not invent or emit non-ISO strings).
- serialNumber: the ticket serial as printed. MUST be mostly digits with exactly ONE letter at the beginning OR the end only (examples: "A123456", "123456B", "A424944"). NEVER put a letter in the middle. NEVER put production lot/ký hiệu codes here (reject forms like "4E2", "5D2", "XSCMG997", "08D", "8K4", "26-T05K4").
- ticketType: printed ticket PRICE as digits when possible (e.g. "10000"), not a product category.
- batchCode: production batch / ký hiệu / lô phát hành printed by the lottery issuer on the ticket (alphanumeric lot code such as "08D", "8K4", "4E2", "XSCMG997", "26-T05K4"). NOT a warehouse import-batch code. NOT the serialNumber. Null if not visible.
- fieldConfidences must include stationName, serialNumber, numbers, drawDate, ticketType, and batchCode (0.0-1.0).
- fieldBoxes: for each non-null field above, provide a tight bounding box around that printed value inside the ticket. Omit boxes for null/unreadable fields. Do not copy template layout boxes unless they match the actual printed text.
- usedFieldLayouts: for each non-null extracted field that used a template layout, map fieldName to that layout's id (integer). Omit entries when no layout was used.
- Also provide ticket-level bbox around the whole ticket region (even when some fields are missing).
{layout_section}
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
      "bbox": {{ "x": number, "y": number, "width": number, "height": number }} | null,
      "fieldBoxes": {{
        "stationName": {{ "x": number, "y": number, "width": number, "height": number }},
        "serialNumber": {{ "x": number, "y": number, "width": number, "height": number }},
        "numbers": {{ "x": number, "y": number, "width": number, "height": number }},
        "drawDate": {{ "x": number, "y": number, "width": number, "height": number }},
        "ticketType": {{ "x": number, "y": number, "width": number, "height": number }},
        "batchCode": {{ "x": number, "y": number, "width": number, "height": number }}
      }},
      "usedFieldLayouts": {{
        "stationName": number,
        "serialNumber": number,
        "numbers": number,
        "drawDate": number,
        "ticketType": number,
        "batchCode": number
      }}
    }}
  ],
  "warnings": [string]
}}
"""

