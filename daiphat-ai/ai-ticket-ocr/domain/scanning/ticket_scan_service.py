import time
import uuid
from dataclasses import dataclass, field
from typing import Callable

import cv2
import numpy as np

from domain.detection.base import DetectedRegion, TicketDetectorStrategy
from domain.layouts.factory import LayoutStrategyFactory
from domain.layouts.yolo_field_layout import FIELD_REGION_PREFIX
from domain.ocr.base import OcrStrategy
from domain.parsing.ticket_parser import ParsedTicket, TicketParser, is_preferred_batch_code
from domain.preprocessing import pipeline as image_pipeline
from domain.preprocessing.pipeline import ProcessedTicketCrop
from domain.ocr.base import OcrTextResult
from domain.scanning import paper_outline
from domain.scanning import template_field_locator as template_locator
from domain.scanning import template_registration
from domain.scanning.status_resolver import resolve_status
from domain.scanning.yolo_llm_guidance import build_yolo_llm_guidance
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata, StationTemplateMetadata
from dto.response.scan_response import BoundingBox, ScanResponse, TicketScanResult
from infra.config import settings
from infra.logger import logger
from infra.template_samples import load_sample_image


def _field_hint_from_region(region_name: str) -> str | None:
    """Map layout region name ``field:serialNumber`` → ``serialNumber``."""
    if region_name.startswith(FIELD_REGION_PREFIX):
        hint = region_name[len(FIELD_REGION_PREFIX) :].strip()
        return hint or None
    return None


_ORIENTATION_PROBE_MAX_DIMENSION = 480
_ORIENTATION_MIN_TRUSTED_SCORE = 0.3
_ROI_PADDING_Y = 0.06
_ROI_PADDING_X = 0.30
_ROI_UPSCALE_MIN_DIMENSION = 200
_ROI_REFINEMENT_CONFIDENCE_CEILING = 0.85
# EasyOCR/Paddle on CPU dominates latency — keep OCR canvases modest but
# large enough for serial letter + 6-digit glyphs.
_EASYOCR_MAX_DIMENSION = 640
_EASYOCR_FIELD_MAX_DIMENSION = 720
_EASYOCR_SERIAL_FIELD_MAX_DIMENSION = 880
_REVIEW_JPEG_QUALITY = 88
# Template path: whole-ticket read must resolve the station banner and field
# text well enough to be assigned to template boxes (Paddle det side = 960).
_TEMPLATE_WHOLE_MAX_DIMENSION = 960
_TEMPLATE_TRUST_CONFIDENCE = 0.80
_TEMPLATE_FIELD_PAD_RATIO = 0.08
# A template region this much taller than wide holds vertical print.
_VERTICAL_TEXT_ASPECT = 1.3
# Ranking a field's readings across its regions: confidence of the lines that
# produced the value, adjusted for priority, line count, shape and agreement.
_PRIORITY_PENALTY = 0.05
_MULTI_LINE_PENALTY = 0.05
_LETTERED_SERIAL_BONUS = 0.15
_FULL_NUMBER_BONUS = 0.10
_PREFERRED_BATCH_BONUS = 0.10
_AGREEMENT_BONUS = 0.10

DetectorProvider = Callable[[str | None, int | None], TicketDetectorStrategy]

# Priority order for YOLO / heuristic field crops on the local path.
_FIELD_OCR_ORDER = (
    "numbers",
    "serialNumber",
    "drawDate",
    "stationName",
    "ticketType",
    "batchCode",
)

# Core fields — whole-ticket OCR always runs; this set is for coverage metrics.
_CORE_FIELD_HINTS = frozenset({"numbers", "serialNumber", "drawDate", "stationName"})


def _heuristic_serial_box(
    tx: int, ty: int, tw: int, th: int
) -> tuple[int, int, int, int]:
    """Default serial ROI: band just above the large number row (…435 S).

    Top-left was often logo/header whitespace; yellow strip near numbers is
    where letter+digit serials usually print on southern tickets.
    """
    return _heuristic_serial_box_near_numbers(tx, ty, tw, th)


def _heuristic_serial_box_near_numbers(
    tx: int, ty: int, tw: int, th: int
) -> tuple[int, int, int, int]:
    """Band just above the large number row (yellow strip: 188435 S)."""
    band_h = max(int(th * 0.14), 26)
    y0 = ty + int(th * 0.40)
    return (tx + int(tw * 0.10), y0, max(int(tw * 0.80), 48), band_h)


def _heuristic_serial_box_footer(
    tx: int, ty: int, tw: int, th: int
) -> tuple[int, int, int, int]:
    """Bottom band fallback (QR / footer serial on some layouts)."""
    band_h = max(int(th * 0.18), 28)
    return (tx + int(tw * 0.05), ty + th - band_h, max(int(tw * 0.90), 40), band_h)


def _heuristic_batch_box(
    tx: int, ty: int, tw: int, th: int
) -> tuple[int, int, int, int]:
    """Bottom-left ký hiệu / lô (05K22). Mid-left often lands on the station logo."""
    band_h = max(int(th * 0.18), 28)
    band_w = max(int(tw * 0.42), 40)
    return (
        tx + int(tw * 0.03),
        ty + th - band_h - int(th * 0.02),
        band_w,
        band_h,
    )


def _looks_like_qr_field_box(
    box: tuple[int, int, int, int], ticket_w: int, ticket_h: int
) -> bool:
    """YOLO sometimes maps drawDate onto the QR code (square, lower-right)."""
    if ticket_w <= 0 or ticket_h <= 0:
        return False
    _x, _y, w, h = (int(v) for v in box)
    if w < 12 or h < 12:
        return False
    aspect = w / float(h)
    if not (0.65 <= aspect <= 1.45):
        return False
    if w > ticket_w * 0.32 or h > ticket_h * 0.32:
        return False
    cx = _x + w * 0.5
    cy = _y + h * 0.5
    return cx >= ticket_w * 0.55 and cy >= ticket_h * 0.55


def _xywh_to_bounding_box(box: tuple[int, int, int, int]) -> BoundingBox:
    x, y, w, h = (int(v) for v in box)
    return BoundingBox(
        x=x,
        y=y,
        width=max(1, w),
        height=max(1, h),
        corners=[[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
    )


def _heuristic_numbers_box_local(width: int, height: int) -> tuple[int, int, int, int]:
    """Center band on an oriented ticket crop for the large lottery number."""
    y0 = int(height * 0.35)
    h = max(int(height * 0.35), 40)
    x0 = int(width * 0.08)
    w = max(int(width * 0.84), 40)
    return (x0, y0, w, h)


def _heuristic_station_box_local(width: int, height: int) -> tuple[int, int, int, int]:
    """Top banner band for nhà đài."""
    return (
        int(width * 0.06),
        int(height * 0.04),
        max(int(width * 0.88), 40),
        max(int(height * 0.18), 24),
    )


def _heuristic_draw_date_box_local(width: int, height: int) -> tuple[int, int, int, int]:
    """Lower-left band for ngày mở thưởng."""
    band_h = max(int(height * 0.16), 24)
    band_w = max(int(width * 0.55), 40)
    return (int(width * 0.04), height - band_h - int(height * 0.02), band_w, band_h)


def _heuristic_price_box_local(width: int, height: int) -> tuple[int, int, int, int]:
    """Upper-right oval for mệnh giá."""
    band_h = max(int(height * 0.14), 22)
    band_w = max(int(width * 0.32), 36)
    return (width - band_w - int(width * 0.04), int(height * 0.04), band_w, band_h)


def _scale_xywh(
    box: tuple[int, int, int, int],
    *,
    src_w: int,
    src_h: int,
    dst_w: int,
    dst_h: int,
) -> tuple[int, int, int, int]:
    if src_w <= 0 or src_h <= 0:
        return box
    x, y, w, h = box
    sx = dst_w / src_w
    sy = dst_h / src_h
    nx = max(0, int(round(x * sx)))
    ny = max(0, int(round(y * sy)))
    nw = max(1, int(round(w * sx)))
    nh = max(1, int(round(h * sy)))
    if nx + nw > dst_w:
        nw = max(1, dst_w - nx)
    if ny + nh > dst_h:
        nh = max(1, dst_h - ny)
    return nx, ny, nw, nh


@dataclass
class _TemplateContext:
    stations: list[StationRef]
    station_templates: list[StationTemplateMetadata] = field(default_factory=list)
    """Global default template regions — only used to probe the station banner."""
    default_regions: list[template_locator.TemplateRegion] = field(default_factory=list)


def _station_id_for(
    stations: list[StationRef], code: str | None, name: str | None
) -> int | None:
    if code:
        for station in stations:
            if station.code and station.code.strip().lower() == code.strip().lower():
                return station.id
    if name:
        for station in stations:
            if station.name and station.name.strip().lower() == name.strip().lower():
                return station.id
    return None


def _ocr_score(lines: list[OcrTextResult]) -> float:
    return sum(float(line.confidence) for line in lines or [])


@dataclass
class _FieldReading:
    value: str
    lines: list[OcrTextResult]
    region: "template_locator.TemplateRegion"
    origin: str
    score: float


def _line_groups(lines: list[OcrTextResult]) -> list[list[OcrTextResult]]:
    """Each line alone, neighbouring pairs in reading order, then all together.

    A region's margin can catch a neighbour's print (the price beside the
    serial); judging lines separately keeps it from gluing onto the value,
    while the joins still recover a value OCR split in two.
    """
    ordered = sorted(lines, key=lambda line: (line.x_center, line.y_center))
    groups = [[line] for line in ordered]
    if len(ordered) > 2:
        groups.extend(ordered[i : i + 2] for i in range(len(ordered) - 1))
    if len(ordered) > 1:
        groups.append(ordered)
    return groups


def _has_expected_shape(field_name: str, value: str, expected_length: int | None) -> bool:
    if field_name == "serialNumber":
        return any(ch.isalpha() for ch in value)
    if field_name == "numbers":
        return len(value) == (expected_length or 6)
    if field_name == "batchCode":
        return is_preferred_batch_code(value)
    return True


def _reading_score(
    field_name: str,
    value: str,
    lines: list[OcrTextResult],
    priority: int,
    expected_length: int | None,
) -> float:
    score = (
        min(float(line.confidence) for line in lines)
        - _PRIORITY_PENALTY * (priority - 1)
        - _MULTI_LINE_PENALTY * (len(lines) - 1)
    )
    if _has_expected_shape(field_name, value, expected_length):
        score += {
            "serialNumber": _LETTERED_SERIAL_BONUS,
            "numbers": _FULL_NUMBER_BONUS,
            "batchCode": _PREFERRED_BATCH_BONUS,
        }.get(field_name, 0.0)
    return score


def _is_decisive(reading: _FieldReading, field_name: str, expected_length: int | None) -> bool:
    """One confident line with the field's expected shape: no need to read further."""
    return (
        len(reading.lines) == 1
        and float(reading.lines[0].confidence) >= _TEMPLATE_TRUST_CONFIDENCE
        and _has_expected_shape(field_name, reading.value, expected_length)
    )


_UNIT_SQUARE = np.float32([[0, 0], [1, 0], [1, 1], [0, 1]])


def _unit_square_to(quad: list[tuple[float, float]]) -> np.ndarray:
    return cv2.getPerspectiveTransform(_UNIT_SQUARE, np.float32(quad))


@dataclass
class _TemplatePlacement:
    """A template's regions and where they lie on the upload.

    ``to_upload`` maps region space (see template_field_locator) to upload
    pixels: the registered sample photo, or the upright ticket outline.
    """

    regions: list[template_locator.TemplateRegion]
    to_upload: np.ndarray
    method: str

    def upload_quad(
        self, region: template_locator.TemplateRegion, *, pad_ratio: float = 0.0
    ) -> list[tuple[float, float]]:
        pad_x, pad_y = region.width * pad_ratio, region.height * pad_ratio
        x0, y0 = region.x - pad_x, region.y - pad_y
        x1, y1 = region.x + region.width + pad_x, region.y + region.height + pad_y
        return template_registration.project(
            self.to_upload, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        )

    def locate_crop_lines(
        self, lines: list[OcrTextResult], crop: ProcessedTicketCrop
    ) -> list[tuple[OcrTextResult, float, float]]:
        """Whole-ticket line centres (crop-normalized) → region space."""
        if not lines or crop.source_quad is None:
            return []
        crop_to_region = np.linalg.inv(self.to_upload) @ _unit_square_to(crop.source_quad)
        centres = template_registration.project(
            crop_to_region, [(line.x_center, line.y_center) for line in lines]
        )
        return [(line, x, y) for line, (x, y) in zip(lines, centres)]


def _quad_to_crop_box(
    quad: list[tuple[float, float]], crop: ProcessedTicketCrop, width: int, height: int
) -> tuple[int, int, int, int] | None:
    """Upload quad → axis-aligned box in crop pixels (``width`` x ``height``)."""
    if crop.source_quad is None:
        return None
    upload_to_crop = np.linalg.inv(_unit_square_to(crop.source_quad))
    points = template_registration.project(upload_to_crop, quad)
    x0 = max(0.0, min(p[0] for p in points))
    y0 = max(0.0, min(p[1] for p in points))
    x1 = min(1.0, max(p[0] for p in points))
    y1 = min(1.0, max(p[1] for p in points))
    if x1 <= x0 or y1 <= y0:
        return None
    x, y = int(round(x0 * width)), int(round(y0 * height))
    return x, y, max(1, int(round(x1 * width)) - x), max(1, int(round(y1 * height)) - y)


def _quad_to_bounding_box(quad: list[tuple[float, float]], scale: float) -> BoundingBox:
    """Upload quad → box in detector-image coordinates (the ticket ``bbox`` space)."""
    points = [(x / scale, y / scale) for x, y in quad]
    x0 = max(0, int(np.floor(min(p[0] for p in points))))
    y0 = max(0, int(np.floor(min(p[1] for p in points))))
    x1 = int(np.ceil(max(p[0] for p in points)))
    y1 = int(np.ceil(max(p[1] for p in points)))
    return BoundingBox(
        x=x0,
        y=y0,
        width=max(1, x1 - x0),
        height=max(1, y1 - y0),
        corners=[[int(round(x)), int(round(y))] for x, y in points],
    )


def _map_box_to_ticket_local(
    field_box: tuple[int, int, int, int],
    ticket_box: tuple[int, int, int, int],
) -> tuple[int, int, int, int] | None:
    """Intersect a full-image field box with the ticket bbox → local xywh."""
    fx, fy, fw, fh = (int(v) for v in field_box)
    tx, ty, tw, th = (int(v) for v in ticket_box)
    x1 = max(fx, tx)
    y1 = max(fy, ty)
    x2 = min(fx + fw, tx + tw)
    y2 = min(fy + fh, ty + th)
    if x2 - x1 < 8 or y2 - y1 < 8:
        return None
    return (x1 - tx, y1 - ty, x2 - x1, y2 - y1)


class TicketScanService:
    """Local OCR pipeline: YOLO detect once → per-ticket field crops → EasyOCR.

    Avoids a second YOLO inference per ticket (old yolo_field layout path) and
    prefers tight field crops with charset allowlists for serial/numbers/date.
    """

    def __init__(
        self,
        detector_provider: DetectorProvider,
        ocr_strategy: OcrStrategy,
        validator: FormatValidator,
        max_file_size_mb: int,
        max_image_dimension: int,
        station_fuzzy_threshold: int,
        high_confidence_threshold: float,
        low_confidence_threshold: float,
        include_cropped_image: bool = True,
        template_sample_loader: Callable[[str], np.ndarray | None] | None = None,
    ) -> None:
        self._sample_loader = template_sample_loader or load_sample_image
        self._paper_quad_cache: dict = {}
        self._sample_features_cache: dict = {}
        self._detector_provider = detector_provider
        self._ocr_strategy = ocr_strategy
        self._validator = validator
        self._max_file_size_mb = max_file_size_mb
        self._max_image_dimension = max_image_dimension
        self._station_fuzzy_threshold = station_fuzzy_threshold
        self._high_confidence_threshold = high_confidence_threshold
        self._low_confidence_threshold = low_confidence_threshold
        self._include_cropped_image = include_cropped_image

    def scan_image(self, image_bytes: bytes, metadata: ScanMetadata) -> ScanResponse:
        t_all = time.perf_counter()
        stage_ms: dict[str, float] = {}

        image_pipeline.guard_file_size(image_bytes, self._max_file_size_mb)
        t0 = time.perf_counter()
        original = image_pipeline.decode_image(image_bytes)
        # Detector-sized copy: YOLO/contour boxes and response bboxes use it;
        # the template path warps each ticket out of ``original`` instead.
        image = image_pipeline.resize_if_needed(original, self._max_image_dimension)
        source_scale = original.shape[1] / float(max(image.shape[1], 1))
        stage_ms["decode"] = (time.perf_counter() - t0) * 1000.0

        stations = [
            StationRef(id=s.id, name=s.name, code=s.code, aliases=tuple(s.aliases))
            for s in metadata.activeStations
        ] or list(DEFAULT_STATIONS)
        station_matcher = StationMatcher(stations)
        parser = TicketParser(station_matcher, self._station_fuzzy_threshold)

        expected_lengths_by_code = {
            s.code: s.expectedNumberLength
            for s in metadata.activeStations
            if s.code and s.expectedNumberLength
        }

        max_tickets = metadata.maxTickets or settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE
        max_tickets = min(max_tickets, settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE)

        # One YOLO pass for tickets + field boxes (same weights as LLM path).
        t0 = time.perf_counter()
        yolo = build_yolo_llm_guidance(image, max_tickets=max_tickets, encode_crops=False)
        stage_ms["yolo"] = (time.perf_counter() - t0) * 1000.0

        warnings: list[str] = []
        tickets: list[TicketScanResult] = []

        use_template_strategy = bool(
            getattr(settings, "TICKET_VISION_LEGACY_TEMPLATE_STRATEGY", True)
        )
        use_yolo_fields = bool(getattr(settings, "TICKET_VISION_LEGACY_USE_YOLO_FIELDS", False))
        template_ctx = _TemplateContext(
            stations=stations,
            station_templates=list(metadata.stationTemplates or []),
            default_regions=template_locator.regions_from_layouts(
                list(metadata.fieldLayouts or [])
            ),
        )
        if use_template_strategy:
            logger.info(
                "Legacy template strategy: stationTemplates=%s defaultLayouts=%s yoloFields=%s",
                len(template_ctx.station_templates),
                len(template_ctx.default_regions),
                use_yolo_fields,
            )

        if yolo.ticket_count >= 1 and yolo.ticket_boxes:
            t0 = time.perf_counter()
            image_h, image_w = image.shape[:2]
            for index, (tx, ty, tw, th) in enumerate(yolo.ticket_boxes):
                if len(tickets) >= max_tickets:
                    break
                try:
                    ticket_region = DetectedRegion(
                        bbox=(tx, ty, tw, th),
                        corners=(
                            list(yolo.ticket_corners[index])
                            if index < len(yolo.ticket_corners) and len(yolo.ticket_corners[index]) == 4
                            else [(tx, ty), (tx + tw, ty), (tx + tw, ty + th), (tx, ty + th)]
                        ),
                    )
                    # Tiny pad only — YOLO already frames paper; over-pad pulls
                    # neighbor tickets into the crop (wrong station/batch OCR).
                    tx, ty, tw, th = image_pipeline.expand_bbox(
                        tx,
                        ty,
                        tw,
                        th,
                        image_w,
                        image_h,
                        pad_ratio=0.015,
                        min_pad_px=6,
                    )
                    aabb_region = DetectedRegion(
                        bbox=(tx, ty, tw, th),
                        corners=[
                            (tx, ty),
                            (tx + tw, ty),
                            (tx + tw, ty + th),
                            (tx, ty + th),
                        ],
                    )
                    field_boxes = (
                        yolo.ticket_field_boxes[index]
                        if use_yolo_fields and index < len(yolo.ticket_field_boxes)
                        else {}
                    )
                    if use_template_strategy:
                        result = self._scan_one_region_with_template(
                            image,
                            ticket_region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            template_ctx,
                            fallback_region=aabb_region,
                            fallback_field_boxes=field_boxes,
                            source=original,
                            source_scale=source_scale,
                        )
                    else:
                        result = self._scan_one_region_with_fields(
                            image,
                            aabb_region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            field_boxes=field_boxes,
                        )
                    tickets.append(result)
                except Exception:  # noqa: BLE001
                    logger.exception("Failed to process YOLO ticket #%s", index)
                    warnings.append(f"Vé #{index}: xử lý thất bại, đã bỏ qua.")
            stage_ms["ocr_tickets"] = (time.perf_counter() - t0) * 1000.0
        else:
            # Contour / classic detector fallback when YOLO finds nothing.
            t0 = time.perf_counter()
            detector = self._detector_provider(metadata.detectorStrategy, metadata.maxTickets)
            detection_result = detector.detect(image)
            warnings.extend(detection_result.warnings or [])
            stage_ms["detect_fallback"] = (time.perf_counter() - t0) * 1000.0

            t0 = time.perf_counter()
            regions = list(detection_result.regions)
            for index, region in enumerate(regions):
                try:
                    if use_template_strategy:
                        result = self._scan_one_region_with_template(
                            image,
                            region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            template_ctx,
                            fallback_region=region,
                            fallback_field_boxes={},
                            source=original,
                            source_scale=source_scale,
                        )
                    else:
                        result = self._scan_one_region_with_fields(
                            image,
                            region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            field_boxes={},
                        )
                    tickets.append(result)
                except Exception:  # noqa: BLE001
                    logger.exception("Failed to process detected ticket #%s", index)
                    warnings.append(f"Vé #{index}: xử lý thất bại, đã bỏ qua.")
            stage_ms["ocr_tickets"] = (time.perf_counter() - t0) * 1000.0

        stage_ms["total"] = (time.perf_counter() - t_all) * 1000.0
        logger.info(
            "Legacy OCR stage timings ms: %s (tickets=%s)",
            {k: int(round(v)) for k, v in stage_ms.items()},
            len(tickets),
        )

        # Ticket bboxes are in the detector-sized image; say so, or clients
        # draw them on the original upload at the wrong scale.
        image_h, image_w = image.shape[:2]
        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
            imageWidth=image_w,
            imageHeight=image_h,
        )

    def _prepare_ocr_canvas(
        self,
        image: np.ndarray,
        *,
        max_dimension: int = _EASYOCR_MAX_DIMENSION,
        field_hint: str | None = None,
        already_enhanced: bool = False,
    ) -> np.ndarray:
        """Downscale + mild enhance so EasyOCR stays fast and digits stay sharp."""
        if image is None or image.size == 0:
            return image
        if field_hint:
            working = image_pipeline.prepare_field_crop_for_ocr(image, field_hint)
        elif already_enhanced:
            working = image
        else:
            working = image_pipeline.enhance_for_ocr(image)
        return image_pipeline.resize_if_needed(working, max_dimension)

    def _ocr_region(
        self,
        image: np.ndarray,
        *,
        field_hint: str | None = None,
        already_enhanced: bool = False,
        max_dimension: int | None = None,
    ) -> list:
        if max_dimension is not None:
            max_dim = max_dimension
        elif field_hint in {"serialNumber", "batchCode", "stationName"}:
            max_dim = _EASYOCR_SERIAL_FIELD_MAX_DIMENSION
        elif field_hint:
            max_dim = _EASYOCR_FIELD_MAX_DIMENSION
        else:
            max_dim = _EASYOCR_MAX_DIMENSION
        canvas = self._prepare_ocr_canvas(
            image,
            max_dimension=max_dim,
            field_hint=field_hint,
            already_enhanced=already_enhanced,
        )
        canvas = image_pipeline.upscale_if_too_small(canvas)
        return self._ocr_strategy.read_text(canvas, field_hint=field_hint)

    def _ocr_field_crop(
        self,
        canvas: np.ndarray,
        box: tuple[int, int, int, int],
        *,
        field_hint: str,
        preview: np.ndarray | None = None,
    ) -> list:
        fx, fy, fw, fh = box
        field_crop = canvas[fy : fy + fh, fx : fx + fw]
        if field_crop is None or field_crop.size == 0:
            return []
        field_crop = image_pipeline.upscale_if_too_small(field_crop)
        lines = self._ocr_region(field_crop, field_hint=field_hint, already_enhanced=True)
        if lines:
            return lines
        # One raw-preview retry for stylized banners only (cheap vs EasyOCR).
        if (
            field_hint in {"stationName", "batchCode"}
            and preview is not None
            and preview.size > 0
        ):
            ph, pw = preview.shape[:2]
            scaled = _scale_xywh(
                box, src_w=canvas.shape[1], src_h=canvas.shape[0], dst_w=pw, dst_h=ph
            )
            px, py, pw_, ph_ = scaled
            raw = preview[py : py + ph_, px : px + pw_]
            if raw.size > 0:
                return self._ocr_region(
                    image_pipeline.upscale_if_too_small(raw),
                    field_hint=field_hint,
                    already_enhanced=False,
                )
        return []

    def _scan_one_region_with_fields(
        self,
        image: np.ndarray,
        region: DetectedRegion,
        index: int,
        parser: TicketParser,
        expected_lengths_by_code: dict[str, int],
        *,
        field_boxes: dict[str, tuple[int, int, int, int]],
        prepared_crop: ProcessedTicketCrop | None = None,
        whole_lines: list | None = None,
        extra_regions: dict[str, list] | None = None,
    ) -> TicketScanResult:
        """Generic layout: YOLO field boxes (opt-in) + heuristic bands.

        ``prepared_crop`` / ``whole_lines`` let the template path hand over its
        already-oriented crop and whole-ticket OCR instead of redoing them.
        """
        if prepared_crop is not None:
            crop = prepared_crop
        else:
            crop = image_pipeline.process_ticket_crop(image, region)
            crop = self._correct_orientation(crop)

        ocr_results_by_region: dict = dict(extra_regions or {})
        canvas = crop.ocr_ready
        ch, cw = canvas.shape[:2]
        tx, ty, tw, th = region.bbox
        boxes = dict(field_boxes or {})

        # Drop YOLO drawDate when it landed on the QR (square lower-right).
        draw_box = boxes.get("drawDate")
        if draw_box and _looks_like_qr_field_box(draw_box, tw, th):
            logger.info(
                "Ticket #%s ignoring YOLO drawDate box (looks like QR)", index
            )
            boxes.pop("drawDate", None)

        # Full-frame heuristics only make sense next to full-frame YOLO boxes;
        # otherwise the crop-local heuristic fills below cover serial/batch
        # (and stay correct on a rotated / OBB-warped crop).
        if boxes and "serialNumber" not in boxes and tw > 0 and th > 0:
            boxes["serialNumber"] = _heuristic_serial_box(tx, ty, tw, th)
        if boxes and "batchCode" not in boxes and tw > 0 and th > 0:
            boxes["batchCode"] = _heuristic_batch_box(tx, ty, tw, th)

        # Prefer field crops from the *oriented color ticket canvas* so OCR
        # sees the same upright image as Admin preview (not a sideways /
        # grayscale strip from the full photo).
        # fieldBoxes returned to Admin are crop-local (this canvas), not
        # full-frame — overlay them on the cropped ticket preview only.
        crop_local_boxes: dict[str, tuple[int, int, int, int]] = {}
        for field_name in _FIELD_OCR_ORDER:
            local: tuple[int, int, int, int] | None = None
            if field_name == "numbers" and field_name not in (field_boxes or {}):
                local = _heuristic_numbers_box_local(cw, ch)
            else:
                box = boxes.get(field_name)
                if box and len(box) == 4:
                    local = _map_box_to_ticket_local(box, (tx, ty, tw, th))
                    if local is not None and tw > 0 and th > 0:
                        # Map into canvas pixels (warped size may differ).
                        lx, ly, lw, lh = local
                        sx = cw / max(tw, 1)
                        sy = ch / max(th, 1)
                        local = (
                            max(0, int(lx * sx)),
                            max(0, int(ly * sy)),
                            max(8, int(lw * sx)),
                            max(8, int(lh * sy)),
                        )
            if local is None:
                continue
            fx, fy, fw, fh = image_pipeline.expand_bbox(
                local[0], local[1], local[2], local[3], cw, ch, pad_ratio=0.04, min_pad_px=4
            )
            crop_local_boxes[field_name] = (fx, fy, fw, fh)
            lines = self._ocr_field_crop(
                canvas,
                (fx, fy, fw, fh),
                field_hint=field_name,
                preview=crop.preview,
            )
            if lines:
                ocr_results_by_region[f"{FIELD_REGION_PREFIX}{field_name}"] = lines

        # Fill overlay gaps when YOLO missed a class — and OCR those bands
        # (previously station/batch heuristics were overlay-only → UNREADABLE).
        heuristic_fills: list[tuple[str, tuple[int, int, int, int]]] = []
        if "stationName" not in crop_local_boxes:
            heuristic_fills.append(("stationName", _heuristic_station_box_local(cw, ch)))
        if "drawDate" not in crop_local_boxes:
            heuristic_fills.append(("drawDate", _heuristic_draw_date_box_local(cw, ch)))
        if "ticketType" not in crop_local_boxes:
            heuristic_fills.append(("ticketType", _heuristic_price_box_local(cw, ch)))
        if "numbers" not in crop_local_boxes:
            heuristic_fills.append(("numbers", _heuristic_numbers_box_local(cw, ch)))
        if "serialNumber" not in crop_local_boxes:
            heuristic_fills.append(("serialNumber", _heuristic_serial_box(0, 0, cw, ch)))
        if "batchCode" not in crop_local_boxes:
            heuristic_fills.append(("batchCode", _heuristic_batch_box(0, 0, cw, ch)))

        for field_name, local in heuristic_fills:
            fx, fy, fw, fh = image_pipeline.expand_bbox(
                local[0], local[1], local[2], local[3], cw, ch, pad_ratio=0.04, min_pad_px=4
            )
            crop_local_boxes[field_name] = (fx, fy, fw, fh)
            key = f"{FIELD_REGION_PREFIX}{field_name}"
            if ocr_results_by_region.get(key):
                continue
            lines = self._ocr_field_crop(
                canvas, (fx, fy, fw, fh), field_hint=field_name, preview=crop.preview
            )
            if lines:
                ocr_results_by_region[key] = lines

        # Serial: at most one extra ROI if the primary band was empty.
        # (Letter recovery from digit-only crops is handled by whole-ticket OCR.)
        serial_key = f"{FIELD_REGION_PREFIX}serialNumber"
        if not ocr_results_by_region.get(serial_key):
            footer = _heuristic_serial_box_footer(0, 0, cw, ch)
            fx, fy, fw, fh = image_pipeline.expand_bbox(
                footer[0], footer[1], footer[2], footer[3], cw, ch, pad_ratio=0.03, min_pad_px=3
            )
            lines = self._ocr_field_crop(
                canvas, (fx, fy, fw, fh), field_hint="serialNumber", preview=None
            )
            if lines:
                ocr_results_by_region[serial_key] = lines
                crop_local_boxes["serialNumber"] = (fx, fy, fw, fh)
            else:
                # Single vertical-edge attempt (HCM-style) — one orientation only.
                edge_w = max(int(cw * 0.14), 24)
                edge = canvas[:, max(0, cw - edge_w) : cw]
                if edge.size > 0:
                    probe = image_pipeline.rotate_quarter_turns(edge, 1)
                    probe = image_pipeline.upscale_if_too_small(probe)
                    lines = self._ocr_region(
                        probe, field_hint="serialNumber", already_enhanced=True
                    )
                    if lines:
                        ocr_results_by_region[serial_key] = lines

        # Always OCR the whole oriented color ticket once.
        if whole_lines is None:
            whole_lines = self._ocr_region(canvas, already_enhanced=True)
        if not whole_lines and crop.preview is not None and crop.preview.size > 0:
            # Glare/enhance on scenic tickets can blank Paddle/EasyOCR while the
            # Admin preview still looks sharp — retry on the raw warped crop.
            logger.info(
                "Whole-ticket OCR empty on enhanced canvas; retrying raw preview (ticket #%s)",
                index,
            )
            whole_lines = self._ocr_region(crop.preview)
        ocr_results_by_region["whole"] = whole_lines
        logger.info(
            "Ticket #%s OCR lines: whole=%s fields=%s",
            index,
            len(whole_lines),
            {
                k[len(FIELD_REGION_PREFIX) :]: len(v)
                for k, v in ocr_results_by_region.items()
                if k.startswith(FIELD_REGION_PREFIX)
            },
        )

        # Layout fallback only when YOLO produced zero field hits.
        has_field_ocr = any(k.startswith(FIELD_REGION_PREFIX) for k in ocr_results_by_region)
        if not has_field_ocr:
            layout = LayoutStrategyFactory.get_for_station(None)
            regions_map = layout.get_regions(canvas)
            for name, region_image in regions_map.items():
                if name == "whole":
                    continue
                ocr_results_by_region[name] = self._ocr_region(
                    region_image,
                    field_hint=_field_hint_from_region(name),
                    already_enhanced=True,
                )

        return self._finalize_ticket(
            crop,
            region,
            index,
            parser,
            expected_lengths_by_code,
            ocr_results_by_region,
            crop_local_boxes,
            retarget_batch_box=True,
        )

    def _finalize_ticket(
        self,
        crop: ProcessedTicketCrop,
        region: DetectedRegion,
        index: int,
        parser: TicketParser,
        expected_lengths_by_code: dict[str, int],
        ocr_results_by_region: dict[str, list],
        crop_local_boxes: dict[str, tuple[int, int, int, int]],
        *,
        retarget_batch_box: bool,
        template_fields: frozenset[str] = frozenset(),
    ) -> TicketScanResult:
        """Parse → numbers retry → validate → build the per-ticket response.

        ``template_fields`` are owned by the station OCR template: their
        values come only from the template boxes (see ``TicketParser.parse``).
        """
        canvas = crop.ocr_ready
        ch, cw = canvas.shape[:2]

        parsed: ParsedTicket = parser.parse(
            ocr_results_by_region, expected_number_length=None, template_fields=template_fields
        )
        expected_length = expected_lengths_by_code.get(parsed.extracted.stationCode)
        if expected_length is not None:
            parsed = parser.parse(
                ocr_results_by_region,
                expected_number_length=expected_length,
                template_fields=template_fields,
            )

        # If numbers still missing, force an unconstrained OCR on color crop /
        # preview: of the template box when the template owns numbers, else
        # of the generic center band.
        numbers_box = crop_local_boxes.get("numbers") if "numbers" in template_fields else None
        if not getattr(parsed.extracted, "numbers", None):
            for source in (canvas, crop.preview):
                if source is None or source.size == 0:
                    continue
                sh, sw = source.shape[:2]
                if numbers_box is not None:
                    lx, ly, lw, lh = _scale_xywh(
                        numbers_box, src_w=cw, src_h=ch, dst_w=sw, dst_h=sh
                    )
                else:
                    lx, ly, lw, lh = _heuristic_numbers_box_local(sw, sh)
                band = source[ly : ly + lh, lx : lx + lw]
                if band.size == 0:
                    continue
                # Prefer unconstrained OCR (no specialized allowlist dead-end).
                lines = self._ocr_region(
                    image_pipeline.upscale_if_too_small(band),
                    field_hint=None,
                    already_enhanced=(source is canvas),
                )
                if lines:
                    ocr_results_by_region[f"{FIELD_REGION_PREFIX}numbers"] = lines
                    parsed = parser.parse(
                        ocr_results_by_region,
                        expected_number_length=expected_length,
                        template_fields=template_fields,
                    )
                    if getattr(parsed.extracted, "numbers", None):
                        break

        # Optional ROI refine when numbers are truncated (5 of 6 digits).
        numbers = getattr(parsed.extracted, "numbers", None)
        want_len = expected_length or 6
        if numbers and len(str(numbers)) != want_len:
            parsed = self._refine_low_confidence_fields(
                crop, parsed, parser, expected_length
            )
        elif not bool(getattr(settings, "TICKET_VISION_LEGACY_SKIP_ROI_REFINE", True)):
            parsed = self._refine_low_confidence_fields(
                crop, parsed, parser, expected_length
            )

        # Retarget overlay batch box toward bottom-left when we have a code
        # but the mid/logo heuristic was used (YOLO has no batch class).
        if (
            retarget_batch_box
            and getattr(parsed.extracted, "batchCode", None)
            and "batchCode" in crop_local_boxes
        ):
            bx, by, bw, bh = crop_local_boxes["batchCode"]
            # Logo-ish mid band: move overlay to bottom-left ký hiệu band.
            if by < int(ch * 0.45):
                crop_local_boxes["batchCode"] = _heuristic_batch_box(0, 0, cw, ch)

        # Confidences are 0..1 fractions on the wire; clients scale them to %.
        parsed.field_confidences = {
            name: min(1.0, max(0.0, float(value)))
            for name, value in parsed.field_confidences.items()
        }
        validation = self._validator.validate(parsed.extracted, expected_number_length=expected_length)
        status, confidence = resolve_status(
            parsed.field_confidences,
            validation,
            self._high_confidence_threshold,
            self._low_confidence_threshold,
        )

        bbox = BoundingBox(
            x=region.bbox[0],
            y=region.bbox[1],
            width=region.bbox[2],
            height=region.bbox[3],
            corners=[[point[0], point[1]] for point in region.corners],
        )

        # Crop-local field boxes aligned to the Admin cropped preview pixels.
        response_field_boxes: dict[str, BoundingBox] = {}
        cropped_image_base64 = None
        preview_w, preview_h = cw, ch
        if self._include_cropped_image and crop.preview is not None and crop.preview.size > 0:
            preview = image_pipeline.resize_if_needed(crop.preview, 900)
            preview_h, preview_w = preview.shape[:2]
            cropped_image_base64 = image_pipeline.encode_to_base64_jpeg(
                preview, quality=_REVIEW_JPEG_QUALITY
            )

        for name, box in crop_local_boxes.items():
            scaled = _scale_xywh(
                box, src_w=cw, src_h=ch, dst_w=preview_w, dst_h=preview_h
            )
            response_field_boxes[name] = _xywh_to_bounding_box(scaled)

        return TicketScanResult(
            ticketIndex=index,
            bbox=bbox,
            status=status,
            confidence=confidence,
            extracted=parsed.extracted,
            fieldConfidences=parsed.field_confidences,
            fieldBoxes=response_field_boxes,
            missingFields=validation.missing_fields,
            validationErrors=validation.errors,
            croppedImageBase64=cropped_image_base64,
        )

    def _scan_one_region_with_template(
        self,
        image: np.ndarray,
        region: DetectedRegion,
        index: int,
        parser: TicketParser,
        expected_lengths_by_code: dict[str, int],
        ctx: _TemplateContext,
        *,
        fallback_region: DetectedRegion,
        fallback_field_boxes: dict[str, tuple[int, int, int, int]],
        source: np.ndarray | None = None,
        source_scale: float = 1.0,
    ) -> TicketScanResult:
        """YOLO ticket → station → template placed on the original upload → fields.

        ``region`` is in ``image`` (detector-sized) pixels; ``source`` is the
        original upload, ``source_scale`` its size relative to ``image``.
        YOLO only locates the ticket; field regions are projected onto the
        original pixels and OCR reads them there. Field boxes are the template
        regions as configured: OCR reads inside them but never moves them.
        """
        upload = source if source is not None else image
        scale = source_scale if source is not None else 1.0
        crop = self._template_ticket_crop(image, region, source, source_scale)
        crop = self._correct_orientation(crop)
        whole_lines, station_parsed = self._read_whole_ticket(crop, parser)

        # Geometric orientation cannot tell upright from upside-down; the
        # station name is the tie-breaker (one extra OCR pass, only when needed).
        if station_parsed.extracted.stationName is None:
            flipped = image_pipeline.rotate_crop(crop, 2)
            flipped_lines, flipped_parsed = self._read_whole_ticket(flipped, parser)
            if (
                flipped_parsed.extracted.stationName is not None
                or _ocr_score(flipped_lines) > _ocr_score(whole_lines) * 1.2
            ):
                logger.info(
                    "Ticket #%s: 180° orientation reads better (station=%s)",
                    index,
                    flipped_parsed.extracted.stationName,
                )
                crop, whole_lines, station_parsed = flipped, flipped_lines, flipped_parsed

        station_name = station_parsed.extracted.stationName
        station_code = station_parsed.extracted.stationCode
        extra_regions: dict[str, list] = {}
        if station_name is None:
            probe_name, probe_lines = self._probe_station_banner(crop, parser, ctx)
            if probe_name:
                station_name = probe_name
                station_code = next(
                    (s.code for s in ctx.stations if s.name == probe_name), None
                )
                extra_regions[f"{FIELD_REGION_PREFIX}stationName"] = probe_lines
        station_id = _station_id_for(ctx.stations, station_code, station_name)

        template = template_locator.select_station_template(station_id, ctx.station_templates)
        placement = self._place_template(template, crop, upload) if template is not None else None
        if placement is None or not placement.regions:
            logger.info(
                "Ticket #%s: no OCR template for station=%s (id=%s) — generic layout",
                index,
                station_name,
                station_id,
            )
            if fallback_field_boxes:
                return self._scan_one_region_with_fields(
                    image,
                    fallback_region,
                    index,
                    parser,
                    expected_lengths_by_code,
                    field_boxes=fallback_field_boxes,
                )
            return self._scan_one_region_with_fields(
                image,
                region,
                index,
                parser,
                expected_lengths_by_code,
                field_boxes={},
                prepared_crop=crop,
                whole_lines=whole_lines,
                extra_regions=extra_regions,
            )

        expected_length = expected_lengths_by_code.get(station_code) if station_code else None
        grouped = template_locator.group_by_field(placement.regions)
        in_region = template_locator.lines_by_region(
            placement.locate_crop_lines(whole_lines, crop), placement.regions
        )

        ch, cw = crop.ocr_ready.shape[:2]
        ocr_results_by_region: dict[str, list] = {"whole": whole_lines, **extra_regions}
        crop_local_boxes: dict[str, tuple[int, int, int, int]] = {}
        source_field_boxes: dict[str, BoundingBox] = {}
        used_layouts: dict[str, int] = {}
        from_whole: list[str] = []
        from_upload: list[str] = []

        for field_name in _FIELD_OCR_ORDER:
            field_regions = grouped.get(field_name)
            if not field_regions:
                continue
            used_region = field_regions[0]

            if not (field_name == "stationName" and station_name):
                lines, used_region, origin = self._read_template_field(
                    upload, placement, field_name, field_regions, in_region, parser, expected_length
                )
                if lines:
                    ocr_results_by_region[f"{FIELD_REGION_PREFIX}{field_name}"] = lines
                    read_from = from_whole if origin == "whole" else from_upload
                    read_from.append(f"{field_name}#{used_region.priority}")

            quad = placement.upload_quad(used_region)
            box = _quad_to_crop_box(quad, crop, cw, ch)
            if box is not None:
                crop_local_boxes[field_name] = box
            source_field_boxes[field_name] = _quad_to_bounding_box(quad, scale)
            if used_region.layout_id is not None:
                used_layouts[field_name] = used_region.layout_id

        logger.info(
            "Ticket #%s template OCR: station=%s id=%s templateId=%s placement=%s "
            "whole_lines=%s fields_from_whole=%s fields_from_upload=%s",
            index,
            station_name,
            station_id,
            template.templateId,
            placement.method,
            len(whole_lines),
            from_whole,
            from_upload,
        )

        result = self._finalize_ticket(
            crop,
            region,
            index,
            parser,
            expected_lengths_by_code,
            ocr_results_by_region,
            crop_local_boxes,
            retarget_batch_box=False,
            template_fields=frozenset(grouped),
        )
        return result.model_copy(
            update={"usedFieldLayouts": used_layouts, "sourceFieldBoxes": source_field_boxes}
        )

    def _template_ticket_crop(
        self,
        image: np.ndarray,
        region: DetectedRegion,
        source: np.ndarray | None,
        source_scale: float,
    ) -> ProcessedTicketCrop:
        """Rectify the YOLO ticket outline out of the original upload.

        Used for the whole-ticket read (station + text positions). ``preview``
        keeps the original pixels; ``ocr_ready`` is the enhanced copy used only
        when the original read comes up empty. ``source_quad`` records where
        the crop lies on the upload.
        """
        src = source if source is not None else image
        scale = source_scale if source is not None else 1.0
        if len(region.corners) == 4:
            quad = [(float(x) * scale, float(y) * scale) for x, y in region.corners]
        else:
            x, y, w, h = region.bbox
            quad = [
                (x * scale, y * scale),
                ((x + w) * scale, y * scale),
                ((x + w) * scale, (y + h) * scale),
                (x * scale, (y + h) * scale),
            ]
        warped = image_pipeline.perspective_warp(src, quad)
        preview = image_pipeline.resize_if_needed(
            warped, int(getattr(settings, "TICKET_VISION_TEMPLATE_CANVAS_MAX_DIMENSION", 2400))
        )
        ocr_source = image_pipeline.resize_if_needed(preview, self._max_image_dimension)
        ocr_source = image_pipeline.remove_glare(image_pipeline.upscale_if_too_small(ocr_source))
        ocr_ready = image_pipeline.enhance_for_ocr(ocr_source)
        return ProcessedTicketCrop(preview=preview, ocr_ready=ocr_ready, source_quad=quad)

    def _place_template(
        self,
        template: StationTemplateMetadata,
        crop: ProcessedTicketCrop,
        upload: np.ndarray,
    ) -> _TemplatePlacement | None:
        """Where the template's regions lie on the upload.

        Preferred: the sample photo registered onto the upload, regions kept
        in sample-photo coordinates. Fallback: regions relative to the sample
        paper, laid onto the ticket's paper outline (or the YOLO outline).
        """
        if crop.source_quad is None:
            return None
        layouts = list(template.fieldLayouts)
        to_upload = self._register_template(template, upload, crop.source_quad)
        if to_upload is not None:
            return _TemplatePlacement(
                regions=template_locator.regions_from_layouts(layouts, frame_relative=False),
                to_upload=to_upload,
                method="registered",
            )
        regions = template_locator.regions_from_layouts(layouts, self._template_paper_quad(template))
        outline, snapped = self._ticket_outline(upload, crop.source_quad)
        return _TemplatePlacement(
            regions=regions,
            to_upload=_unit_square_to(outline),
            method="paper" if snapped else "outline",
        )

    def _register_template(
        self,
        template: StationTemplateMetadata,
        upload: np.ndarray,
        ticket_quad: list[tuple[float, float]],
    ) -> np.ndarray | None:
        """Homography: sample-photo normalized coords → upload pixels, or None."""
        if not bool(getattr(settings, "TICKET_VISION_TEMPLATE_REGISTRATION", True)):
            return None
        features = self._template_features(template)
        if features is None:
            return None
        matrix = template_registration.register(features, upload, ticket_quad)
        if matrix is None:
            return None
        return matrix @ np.diag([float(features.photo_width), float(features.photo_height), 1.0])

    def _template_features(
        self, template: StationTemplateMetadata
    ) -> template_registration.SampleFeatures | None:
        """Features of the ticket on the template sample photo, cached per template."""
        if not template.sampleImageUrl:
            return None
        frame = template_locator.template_frame(list(template.fieldLayouts))
        key = (template.templateId, template.sampleImageUrl, frame)
        if key not in self._sample_features_cache:
            sample = self._sample_loader(template.sampleImageUrl)
            if sample is None:
                return None
            box = (frame.x, frame.y, frame.width, frame.height) if frame else (0.0, 0.0, 1.0, 1.0)
            self._sample_features_cache[key] = template_registration.sample_features(sample, box)
        return self._sample_features_cache[key]

    @staticmethod
    def _ticket_outline(
        upload: np.ndarray, quad: list[tuple[float, float]]
    ) -> tuple[list[tuple[float, float]], bool]:
        """Paper edges near the YOLO outline, in the outline's corner order."""
        if not bool(getattr(settings, "TICKET_VISION_TEMPLATE_PAPER_SNAP", True)):
            return quad, False
        snapped = paper_outline.refine_paper_quad(upload, quad)
        if snapped is None:
            return quad, False
        # Keep the upright ticket orientation the outline carries.
        rolls = [snapped[r:] + snapped[:r] for r in range(4)]
        best = min(
            rolls,
            key=lambda cand: sum(float(np.hypot(a[0] - b[0], a[1] - b[1])) for a, b in zip(cand, quad)),
        )
        return best, True

    def _template_paper_quad(self, template: StationTemplateMetadata):
        """Paper edges on the template sample photo, cached per template."""
        if not bool(getattr(settings, "TICKET_VISION_TEMPLATE_PAPER_SNAP", True)):
            return None
        frame = template_locator.template_frame(list(template.fieldLayouts))
        if not template.sampleImageUrl or frame is None:
            return None
        key = (template.templateId, template.sampleImageUrl, frame)
        if key not in self._paper_quad_cache:
            sample = self._sample_loader(template.sampleImageUrl)
            if sample is None:
                return None
            self._paper_quad_cache[key] = template_locator.template_paper_quad(
                list(template.fieldLayouts), sample
            )
        return self._paper_quad_cache[key]

    def _read_whole_ticket(
        self, crop: ProcessedTicketCrop, parser: TicketParser
    ) -> tuple[list, ParsedTicket]:
        """Whole-ticket read of the original pixels; enhanced copy only as a retry."""
        lines = self._ocr_whole_ticket(crop)
        parsed = parser.parse({"whole": lines})
        if parsed.extracted.stationName is None and crop.ocr_ready is not None and crop.ocr_ready.size > 0:
            enhanced_lines = self._ocr_region(
                crop.ocr_ready,
                already_enhanced=True,
                max_dimension=_TEMPLATE_WHOLE_MAX_DIMENSION,
            )
            enhanced_parsed = parser.parse({"whole": enhanced_lines})
            if enhanced_parsed.extracted.stationName is not None or not lines:
                return enhanced_lines, enhanced_parsed
        return lines, parsed

    def _ocr_whole_ticket(self, crop: ProcessedTicketCrop) -> list:
        return self._ocr_region(
            crop.preview,
            already_enhanced=True,
            max_dimension=_TEMPLATE_WHOLE_MAX_DIMENSION,
        )

    def _read_template_field(
        self,
        upload: np.ndarray,
        placement: _TemplatePlacement,
        field_name: str,
        field_regions: list[template_locator.TemplateRegion],
        in_region: dict[template_locator.TemplateRegion, list[OcrTextResult]],
        parser: TicketParser,
        expected_length: int | None,
    ) -> tuple[list, template_locator.TemplateRegion, str]:
        """Best reading of one field across its template regions.

        The whole-ticket lines inside each region are judged first (free),
        then OCR of each region cut from the upload. A decisive reading ends
        the search; otherwise the best-scoring one wins, so a stylized,
        low-confidence print in region #1 cannot beat a clean copy of the
        same value in region #2. Returned lines are only those that produced
        the value.
        """
        readings: list[_FieldReading] = []

        def consider(lines: list, region: template_locator.TemplateRegion, origin: str):
            decisive: _FieldReading | None = None
            for group in _line_groups(lines):
                value = parser.normalise_field(field_name, group, expected_length)
                if value is None:
                    continue
                reading = _FieldReading(
                    value,
                    group,
                    region,
                    origin,
                    _reading_score(field_name, value, group, region.priority, expected_length),
                )
                readings.append(reading)
                if _is_decisive(reading, field_name, expected_length) and (
                    decisive is None or reading.score > decisive.score
                ):
                    decisive = reading
            return decisive

        for region in field_regions:
            decisive = consider(in_region.get(region) or [], region, "whole")
            if decisive is not None:
                return decisive.lines, decisive.region, decisive.origin
        for region in field_regions:
            lines = self._ocr_upload_region(
                upload, placement, region, field_name, parser, expected_length
            )
            decisive = consider(lines, region, "upload")
            if decisive is not None:
                return decisive.lines, decisive.region, decisive.origin
        if not readings:
            return [], field_regions[0], "none"

        def agreed_score(reading: _FieldReading) -> float:
            others = {
                (other.region, other.origin)
                for other in readings
                if other.value == reading.value
                and (other.region, other.origin) != (reading.region, reading.origin)
            }
            return reading.score + _AGREEMENT_BONUS * len(others)

        best = max(readings, key=agreed_score)
        return best.lines, best.region, best.origin

    def _ocr_upload_region(
        self,
        upload: np.ndarray,
        placement: _TemplatePlacement,
        region: template_locator.TemplateRegion,
        field_name: str,
        parser: TicketParser,
        expected_length: int | None,
    ) -> list:
        """OCR one template region rectified straight out of the upload.

        The cut is padded slightly so edge glyphs survive; the padding is an
        OCR margin only and never reaches the returned field box. Tall regions
        hold vertical print (serial along the ticket edge) and are read after
        a quarter turn either way. Original pixels first, enhanced as retry.
        """
        quad = placement.upload_quad(region, pad_ratio=_TEMPLATE_FIELD_PAD_RATIO)
        patch = image_pipeline.perspective_warp(upload, quad)
        if patch is None or patch.size == 0 or min(patch.shape[:2]) < 4:
            return []
        turns = (1, 3) if patch.shape[0] > patch.shape[1] * _VERTICAL_TEXT_ASPECT else (0,)
        fallback: list = []
        for enhanced in (False, True):
            canvas = patch
            if enhanced:
                canvas = image_pipeline.enhance_for_ocr(
                    image_pipeline.remove_glare(image_pipeline.upscale_if_too_small(patch))
                )
            best: list | None = None
            for quarter_turns in turns:
                lines = self._ocr_region(
                    image_pipeline.upscale_if_too_small(
                        image_pipeline.rotate_quarter_turns(canvas, quarter_turns)
                    ),
                    field_hint=field_name,
                    already_enhanced=True,
                )
                if not lines:
                    continue
                if parser.normalise_field(field_name, lines, expected_length) is None:
                    fallback = fallback or lines
                    continue
                if best is None or _ocr_score(lines) > _ocr_score(best):
                    best = lines
            if best is not None:
                return best
        return fallback

    def _probe_station_banner(
        self,
        crop: ProcessedTicketCrop,
        parser: TicketParser,
        ctx: _TemplateContext,
    ) -> tuple[str | None, list]:
        """Station missing from the whole-ticket read: OCR the banner band once or twice."""
        canvas = crop.ocr_ready
        ch, cw = canvas.shape[:2]
        candidates: list[tuple[int, int, int, int]] = []
        for default_region in ctx.default_regions:
            if default_region.field_name != "stationName":
                continue
            px = template_locator.region_to_pixels(default_region, cw, ch)
            if px is not None:
                candidates.append(px)
                break
        candidates.append(_heuristic_station_box_local(cw, ch))
        for box in candidates:
            fx, fy, fw, fh = image_pipeline.expand_bbox(
                box[0], box[1], box[2], box[3], cw, ch, pad_ratio=0.04, min_pad_px=4
            )
            lines = self._ocr_field_crop(
                canvas, (fx, fy, fw, fh), field_hint="stationName", preview=crop.preview
            )
            name = parser.normalise_field("stationName", lines)
            if name:
                return name, lines
        return None, []

    def _correct_orientation(self, crop: ProcessedTicketCrop) -> ProcessedTicketCrop:
        axis_hint = image_pipeline.dominant_text_axis(crop.ocr_ready)
        if bool(getattr(settings, "TICKET_VISION_LEGACY_FAST_ORIENTATION", True)):
            return image_pipeline.rotate_crop(crop, axis_hint)

        primary_pair = (axis_hint, axis_hint + 2)
        best_quarter_turns, best_score = self._best_orientation(crop, primary_pair)
        if best_score < _ORIENTATION_MIN_TRUSTED_SCORE:
            fallback_pair = (axis_hint + 1, axis_hint + 3)
            fallback_turns, fallback_score = self._best_orientation(crop, fallback_pair)
            if fallback_score > best_score:
                best_quarter_turns = fallback_turns
        return image_pipeline.rotate_crop(crop, best_quarter_turns)

    def _best_orientation(
        self, crop: ProcessedTicketCrop, quarter_turn_candidates: tuple[int, int]
    ) -> tuple[int, float]:
        best_turns = 0
        best_score = -1.0
        for quarter_turns in quarter_turn_candidates:
            rotated = image_pipeline.rotate_quarter_turns(crop.ocr_ready, quarter_turns)
            probe = image_pipeline.resize_if_needed(rotated, _ORIENTATION_PROBE_MAX_DIMENSION)
            try:
                results = self._ocr_strategy.read_text(probe)
            except Exception:  # noqa: BLE001
                continue
            score = sum(r.confidence for r in results)
            if score > best_score:
                best_score = score
                best_turns = quarter_turns
        return best_turns, best_score

    def _refine_low_confidence_fields(
        self,
        crop: ProcessedTicketCrop,
        parsed: ParsedTicket,
        parser: TicketParser,
        expected_number_length: int | None,
    ) -> ParsedTicket:
        """Re-crop around weak numbers/date only — skip serial (allowlist crop is better)."""
        for field_name in ("numbers", "drawDate"):
            if parsed.field_confidences.get(field_name, 0.0) >= _ROI_REFINEMENT_CONFIDENCE_CEILING:
                continue
            current = getattr(parsed.extracted, field_name, None)
            if field_name == "numbers" and current and expected_number_length:
                if len(str(current)) == expected_number_length:
                    continue
            if field_name == "drawDate" and current:
                continue

            position = parsed.field_positions.get(field_name)
            if position is None:
                continue

            y_center, x_center = position
            height, width = crop.ocr_ready.shape[:2]
            y = int(y_center * height)
            x = int(x_center * width)
            half_h = max(int(height * _ROI_PADDING_Y), 12)
            half_w = max(int(width * _ROI_PADDING_X), 24)
            y1, y2 = max(y - half_h, 0), min(y + half_h, height)
            x1, x2 = max(x - half_w, 0), min(x + half_w, width)
            roi = crop.ocr_ready[y1:y2, x1:x2]
            if roi.size == 0:
                continue
            if min(roi.shape[:2]) < _ROI_UPSCALE_MIN_DIMENSION:
                roi = image_pipeline.upscale_if_too_small(roi)

            roi_results = self._ocr_region(roi, field_hint=field_name)
            roi_parsed = parser.parse(
                {"whole": roi_results, f"{FIELD_REGION_PREFIX}{field_name}": roi_results},
                expected_number_length=expected_number_length,
            )
            roi_value = getattr(roi_parsed.extracted, field_name, None)
            roi_confidence = roi_parsed.field_confidences.get(field_name, 0.0)
            if (
                roi_value
                and roi_confidence > parsed.field_confidences.get(field_name, 0.0)
            ):
                setattr(parsed.extracted, field_name, roi_value)
                parsed.field_confidences[field_name] = roi_confidence

        return parsed
