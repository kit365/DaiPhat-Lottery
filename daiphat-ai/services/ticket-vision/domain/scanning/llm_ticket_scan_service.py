"""Provider-agnostic LLM vision ticket scan (Gemini / Grok / future models)."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Protocol

import numpy as np

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.preprocessing import pipeline as image_pipeline
from domain.scanning.status_resolver import resolve_status
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import (
    BoundingBox,
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from infra.logger import logger
from infra.vision_extraction import (
    TicketBBox,
    TicketExtraction,
    build_ticket_extraction_prompt,
    format_price_vnd,
)

_UNCERTAIN_FIELD_CONFIDENCE = 0.5
_SUPPORTED_ENGINES = frozenset({"gemini", "grok", "legacy"})
# Optional OCR fields reported in fieldConfidences but not required for COMPLETE.
_OPTIONAL_CONFIDENCE_FIELDS: tuple[str, ...] = ("ticketType", "batchCode")


class VisionClientProtocol(Protocol):
    def analyze_ticket_image(self, image_bytes: bytes, prompt: str): ...


def resolve_recognition_engine(metadata: ScanMetadata, default_engine: str) -> str:
    raw = (metadata.recognitionEngine or default_engine or "gemini").strip().lower()
    if raw in _SUPPORTED_ENGINES:
        return raw
    fallback = (default_engine or "gemini").strip().lower()
    return fallback if fallback in _SUPPORTED_ENGINES else "gemini"


def _normalize_numbers(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    return digits or None


def _normalize_serial(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(r"\s+", "", raw.strip())
    return cleaned or None


def _normalize_batch_code(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(r"\s+", "", raw.strip())
    return cleaned or None


def _normalize_draw_date(raw: str | None) -> str | None:
    """Return ISO YYYY-MM-DD or None. Never pass non-ISO strings downstream."""
    if not raw:
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        datetime.strptime(text, "%Y-%m-%d")
        return text
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _clamp_confidence(value: float | None) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(1.0, float(value)))


def _field_confidences(
    ticket: TicketExtraction,
    extracted: ExtractedTicketFields,
) -> dict[str, float]:
    raw = ticket.fieldConfidences or {}
    result: dict[str, float] = {}
    for field in (*REQUIRED_FIELDS, *_OPTIONAL_CONFIDENCE_FIELDS):
        value = raw.get(field)
        if value is not None:
            result[field] = _clamp_confidence(value)
        elif getattr(extracted, field, None):
            result[field] = _UNCERTAIN_FIELD_CONFIDENCE
        else:
            result[field] = 0.0
    return result


def _clamp_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
) -> BoundingBox | None:
    if not bbox or bbox.width <= 0 or bbox.height <= 0:
        return None
    x = max(0, min(bbox.x, image_width - 1))
    y = max(0, min(bbox.y, image_height - 1))
    w = max(1, min(bbox.width, image_width - x))
    h = max(1, min(bbox.height, image_height - y))
    corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return BoundingBox(x=x, y=y, width=w, height=h, corners=corners)


def _resolve_field_boxes(
    raw_boxes: dict[str, TicketBBox] | None,
    image_width: int,
    image_height: int,
) -> dict[str, BoundingBox]:
    result: dict[str, BoundingBox] = {}
    if not raw_boxes:
        return result
    for name, box in raw_boxes.items():
        clamped = _clamp_bbox(box, image_width, image_height)
        if clamped is not None:
            result[name] = clamped
    return result


def _resolve_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
    ticket_index: int,
    total_tickets: int,
) -> BoundingBox:
    if bbox and bbox.width > 0 and bbox.height > 0:
        x = max(0, min(bbox.x, image_width - 1))
        y = max(0, min(bbox.y, image_height - 1))
        w = max(1, min(bbox.width, image_width - x))
        h = max(1, min(bbox.height, image_height - y))
    elif total_tickets == 1:
        x, y, w, h = 0, 0, image_width, image_height
    else:
        band_h = max(1, image_height // max(total_tickets, 1))
        y = min(ticket_index * band_h, image_height - 1)
        x, w, h = 0, image_width, min(band_h, image_height - y)

    corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return BoundingBox(x=x, y=y, width=w, height=h, corners=corners)


def _crop_image(image: np.ndarray, bbox: BoundingBox) -> np.ndarray:
    h, w = image.shape[:2]
    x1 = max(0, min(bbox.x, w - 1))
    y1 = max(0, min(bbox.y, h - 1))
    x2 = max(x1 + 1, min(bbox.x + bbox.width, w))
    y2 = max(y1 + 1, min(bbox.y + bbox.height, h))
    return image[y1:y2, x1:x2]


class LlmTicketScanService:
    """Scan tickets via a vision LLM client; Layer-1 validation matches legacy path."""

    def __init__(
        self,
        vision_client: VisionClientProtocol,
        *,
        provider_label: str = "LLM",
        validator: FormatValidator | None = None,
        max_file_size_mb: int = 5,
        max_image_dimension: int = 1920,
        max_tickets_per_image: int = 15,
        station_fuzzy_threshold: int = 80,
        high_confidence_threshold: float = 0.85,
        low_confidence_threshold: float = 0.70,
        include_cropped_image: bool = True,
    ) -> None:
        self._vision_client = vision_client
        self._provider_label = provider_label
        self._validator = validator or FormatValidator()
        self._max_file_size_mb = max_file_size_mb
        self._max_image_dimension = max_image_dimension
        self._max_tickets_per_image = max_tickets_per_image
        self._station_fuzzy_threshold = station_fuzzy_threshold
        self._high_confidence_threshold = high_confidence_threshold
        self._low_confidence_threshold = low_confidence_threshold
        self._include_cropped_image = include_cropped_image

    def scan_image(self, image_bytes: bytes, metadata: ScanMetadata) -> ScanResponse:
        image_pipeline.guard_file_size(image_bytes, self._max_file_size_mb)
        image = image_pipeline.decode_image(image_bytes)
        image = image_pipeline.resize_if_needed(image, self._max_image_dimension)
        image_height, image_width = image.shape[:2]
        # Send the same resized JPEG Gemini annotates so bbox coords match crops.
        vision_image_bytes = image_pipeline.encode_to_jpeg_bytes(image)

        max_tickets = metadata.maxTickets or self._max_tickets_per_image
        max_tickets = min(max_tickets, self._max_tickets_per_image)

        stations = [
            StationRef(id=s.id, name=s.name, code=s.code, aliases=tuple(s.aliases))
            for s in metadata.activeStations
        ] or list(DEFAULT_STATIONS)
        station_matcher = StationMatcher(stations)

        expected_lengths_by_code = {
            s.code: s.expectedNumberLength
            for s in metadata.activeStations
            if s.code and s.expectedNumberLength
        }

        stations_payload = [
            {
                "name": s.name,
                "code": s.code,
                "aliases": s.aliases,
                "expectedNumberLength": s.expectedNumberLength,
            }
            for s in metadata.activeStations
        ]
        prompt = build_ticket_extraction_prompt(
            json.dumps(stations_payload, ensure_ascii=False),
            max_tickets,
            image_width,
            image_height,
        )
        extraction = self._vision_client.analyze_ticket_image(vision_image_bytes, prompt)

        warnings = list(extraction.warnings)
        if len(extraction.tickets) > max_tickets:
            warnings.append(
                f"{self._provider_label} trả về {len(extraction.tickets)} vé; "
                f"chỉ xử lý {max_tickets} vé đầu."
            )

        tickets: list[TicketScanResult] = []
        llm_tickets = extraction.tickets[:max_tickets]

        for index, llm_ticket in enumerate(llm_tickets):
            try:
                tickets.append(
                    self._map_ticket(
                        llm_ticket,
                        index,
                        image,
                        image_width,
                        image_height,
                        len(llm_tickets),
                        station_matcher,
                        expected_lengths_by_code,
                    )
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "Failed to map %s ticket #%s", self._provider_label, index
                )
                warnings.append(f"Vé #{index}: xử lý thất bại, đã bỏ qua.")

        if not tickets and not warnings:
            warnings.append(
                f"{self._provider_label} không phát hiện vé nào trong ảnh."
            )

        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
            imageWidth=image_width,
            imageHeight=image_height,
        )

    def _map_ticket(
        self,
        llm_ticket: TicketExtraction,
        index: int,
        image: np.ndarray,
        image_width: int,
        image_height: int,
        total_tickets: int,
        station_matcher: StationMatcher,
        expected_lengths_by_code: dict[str, int | None],
    ) -> TicketScanResult:
        station_name = llm_ticket.stationName.strip() if llm_ticket.stationName else None
        station_code = llm_ticket.stationCode.strip() if llm_ticket.stationCode else None
        match_result = None

        if station_name:
            match_result = station_matcher.match(station_name, self._station_fuzzy_threshold)
            if match_result.station:
                station_name = match_result.station.name
                station_code = match_result.station.code or station_code
            elif match_result.score > 0:
                logger.debug(
                    "%s station '%s' below fuzzy threshold (score=%.2f)",
                    self._provider_label,
                    station_name,
                    match_result.score,
                )

        extracted = ExtractedTicketFields(
            stationName=station_name,
            stationCode=station_code,
            serialNumber=_normalize_serial(llm_ticket.serialNumber),
            numbers=_normalize_numbers(llm_ticket.numbers),
            drawDate=_normalize_draw_date(llm_ticket.drawDate),
            ticketType=format_price_vnd(llm_ticket.ticketType),
            batchCode=_normalize_batch_code(llm_ticket.batchCode),
        )

        field_confidences = _field_confidences(llm_ticket, extracted)

        if match_result and station_name and not match_result.station:
            field_confidences["stationName"] = min(
                field_confidences.get("stationName", _UNCERTAIN_FIELD_CONFIDENCE),
                match_result.score if match_result.score > 0 else _UNCERTAIN_FIELD_CONFIDENCE,
            )

        expected_length = (
            expected_lengths_by_code.get(extracted.stationCode)
            if extracted.stationCode
            else None
        )
        validation = self._validator.validate(extracted, expected_number_length=expected_length)
        status, confidence = resolve_status(
            field_confidences,
            validation,
            self._high_confidence_threshold,
            self._low_confidence_threshold,
        )

        bbox = _resolve_bbox(llm_ticket.bbox, image_width, image_height, index, total_tickets)
        field_boxes = _resolve_field_boxes(llm_ticket.fieldBoxes, image_width, image_height)
        cropped_image_base64 = None
        if self._include_cropped_image:
            crop = _crop_image(image, bbox)
            if crop.size > 0:
                cropped_image_base64 = image_pipeline.encode_to_base64_jpeg(crop)

        return TicketScanResult(
            ticketIndex=index,
            bbox=bbox,
            status=status,
            confidence=confidence,
            extracted=extracted,
            fieldConfidences=field_confidences,
            fieldBoxes=field_boxes,
            missingFields=validation.missing_fields,
            validationErrors=validation.errors,
            croppedImageBase64=cropped_image_base64,
            imageWidth=image_width,
            imageHeight=image_height,
        )
