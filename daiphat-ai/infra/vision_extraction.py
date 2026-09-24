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
    """Full-frame / fallback prompt — keep short; geometry is optional.

    YOLO crop / collage paths use dedicated lean prompts in
    ``llm_ticket_scan_service`` (values only, no fieldBoxes schema).
    """
    layout_section = ""
    if field_layouts_hint:
        layout_section = f"\nLayout/crop hints:\n{field_layouts_hint}\n"

    return f"""Vietnamese lottery ticket OCR. Image {image_width}x{image_height}px.
Extract up to {max_tickets} ticket(s). Only visible values — never invent.
Stations (prefer match): {stations_json}
Fields per ticket: stationName, stationCode, serialNumber, numbers, drawDate, ticketType, batchCode.
- numbers: digits only; length = station expectedNumberLength when known, else keep as printed (do not pad/truncate).
- drawDate: YYYY-MM-DD or null.
- serialNumber: digits + one letter at start OR end (A123456). Not lot codes (08D, 8K4).
- batchCode: issuer ký hiệu/lô (08D, 8K4) or null. Not serialNumber.
- ticketType: price digits when visible.
- fieldConfidences 0..1 for each field above.
- Omit bbox/fieldBoxes/usedFieldLayouts (server supplies geometry).
- warnings: short Vietnamese only if a field is covered/unreadable.
{layout_section}
JSON only:
{{"tickets":[{{"stationName":string|null,"stationCode":string|null,"serialNumber":string|null,"numbers":string|null,"drawDate":string|null,"ticketType":string|null,"batchCode":string|null,"fieldConfidences":{{"stationName":number,"serialNumber":number,"numbers":number,"drawDate":number,"ticketType":number,"batchCode":number}}}}],"warnings":[string]}}
"""

