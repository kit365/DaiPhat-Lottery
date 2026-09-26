import time
import uuid
from typing import Callable

import numpy as np

from domain.detection.base import DetectedRegion, TicketDetectorStrategy
from domain.layouts.factory import LayoutStrategyFactory
from domain.layouts.yolo_field_layout import FIELD_REGION_PREFIX
from domain.ocr.base import OcrStrategy
from domain.parsing.ticket_parser import ParsedTicket, TicketParser
from domain.preprocessing import pipeline as image_pipeline
from domain.preprocessing.pipeline import ProcessedTicketCrop
from domain.scanning.status_resolver import resolve_status
from domain.scanning.yolo_llm_guidance import build_yolo_llm_guidance
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import BoundingBox, ScanResponse, TicketScanResult
from infra.config import settings
from infra.logger import logger


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
    ) -> None:
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
        image = image_pipeline.decode_image(image_bytes)
        image = image_pipeline.resize_if_needed(image, self._max_image_dimension)
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

        if yolo.ticket_count >= 1 and yolo.ticket_boxes:
            t0 = time.perf_counter()
            image_h, image_w = image.shape[:2]
            for index, (tx, ty, tw, th) in enumerate(yolo.ticket_boxes):
                if len(tickets) >= max_tickets:
                    break
                try:
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
                    region = DetectedRegion(
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
                        if index < len(yolo.ticket_field_boxes)
                        else {}
                    )
                    tickets.append(
                        self._scan_one_region_with_fields(
                            image,
                            region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            field_boxes=field_boxes,
                        )
                    )
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
                    tickets.append(
                        self._scan_one_region_with_fields(
                            image,
                            region,
                            index,
                            parser,
                            expected_lengths_by_code,
                            field_boxes={},
                        )
                    )
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

        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
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
    ) -> list:
        if field_hint in {"serialNumber", "batchCode", "stationName"}:
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
    ) -> TicketScanResult:
        crop = image_pipeline.process_ticket_crop(image, region)
        crop = self._correct_orientation(crop)

        ocr_results_by_region: dict = {}
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

        if "serialNumber" not in boxes and tw > 0 and th > 0:
            boxes["serialNumber"] = _heuristic_serial_box(tx, ty, tw, th)
        if "batchCode" not in boxes and tw > 0 and th > 0:
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

        parsed: ParsedTicket = parser.parse(ocr_results_by_region, expected_number_length=None)
        expected_length = expected_lengths_by_code.get(parsed.extracted.stationCode)
        if expected_length is not None:
            parsed = parser.parse(ocr_results_by_region, expected_number_length=expected_length)

        # If numbers still missing, force a center-band OCR on color crop / preview.
        if not getattr(parsed.extracted, "numbers", None):
            for source in (canvas, crop.preview):
                if source is None or source.size == 0:
                    continue
                sh, sw = source.shape[:2]
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
                        ocr_results_by_region, expected_number_length=expected_length
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
        if getattr(parsed.extracted, "batchCode", None) and "batchCode" in crop_local_boxes:
            bx, by, bw, bh = crop_local_boxes["batchCode"]
            # Logo-ish mid band: move overlay to bottom-left ký hiệu band.
            if by < int(ch * 0.45):
                crop_local_boxes["batchCode"] = _heuristic_batch_box(0, 0, cw, ch)

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
