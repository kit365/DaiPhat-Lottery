import time
import uuid
from dataclasses import dataclass, field
from typing import Callable

import numpy as np

from domain.detection.base import DetectedRegion, TicketDetectorStrategy
from domain.layouts.factory import LayoutStrategyFactory
from domain.layouts.yolo_field_layout import FIELD_REGION_PREFIX
from domain.ocr.base import OcrStrategy
from domain.parsing.ticket_parser import ParsedTicket, TicketParser
from domain.preprocessing import pipeline as image_pipeline
from domain.preprocessing.pipeline import ProcessedTicketCrop
from domain.ocr.base import OcrTextResult
from domain.scanning import paper_outline
from domain.scanning import template_field_locator as template_locator
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
_TEMPLATE_FIELD_PAD_RATIO = 0.06

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
        """YOLO ticket → paper outline on the original upload → station → template fields.

        ``region`` is in ``image`` (detector-sized) pixels; ``source`` is the
        original upload, ``source_scale`` its size relative to ``image``.
        Field boxes are the template regions as configured: OCR reads inside
        them but never moves them.
        """
        crop, snapped = self._template_ticket_crop(image, region, source, source_scale)
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
        paper_quad = self._template_paper_quad(template) if template is not None else None
        regions = (
            template_locator.regions_from_layouts(list(template.fieldLayouts), paper_quad)
            if template is not None
            else []
        )
        if not regions:
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
        frame = template_locator.template_frame(list(template.fieldLayouts))
        if frame is None:
            logger.info(
                "Ticket #%s: template %s has no ticketFrame — boxes treated as "
                "relative to the whole sample photo",
                index,
                template.templateId,
            )
        grouped = template_locator.group_by_field(regions)
        assigned = template_locator.assign_lines_to_regions(whole_lines, regions)

        ch, cw = crop.ocr_ready.shape[:2]
        ocr_results_by_region: dict[str, list] = {"whole": whole_lines, **extra_regions}
        crop_local_boxes: dict[str, tuple[int, int, int, int]] = {}
        used_layouts: dict[str, int] = {}
        from_whole: list[str] = []
        from_crop: list[str] = []

        for field_name in _FIELD_OCR_ORDER:
            field_regions = grouped.get(field_name)
            if not field_regions:
                continue
            key = f"{FIELD_REGION_PREFIX}{field_name}"
            used_region = field_regions[0]

            if not (field_name == "stationName" and station_name):
                assigned_lines = assigned.get(field_name) or []
                if assigned_lines and self._template_lines_trusted(
                    parser, field_name, assigned_lines, expected_length
                ):
                    ocr_results_by_region[key] = assigned_lines
                    from_whole.append(field_name)
                else:
                    # Weak / missing in the whole-ticket read: charset-constrained
                    # read of each template box in priority order.
                    chosen: list | None = None
                    for field_region in field_regions:
                        lines = self._ocr_template_field(
                            crop, field_region, field_name, parser, expected_length
                        )
                        if lines and parser.normalise_field(field_name, lines, expected_length) is not None:
                            chosen, used_region = lines, field_region
                            break
                    if chosen is None and assigned_lines:
                        chosen = assigned_lines
                    if chosen:
                        ocr_results_by_region[key] = chosen
                        from_crop.append(field_name)

            box = template_locator.region_to_pixels(used_region, cw, ch)
            if box is not None:
                crop_local_boxes[field_name] = box
            if used_region.layout_id is not None:
                used_layouts[field_name] = used_region.layout_id

        logger.info(
            "Ticket #%s template OCR: station=%s id=%s templateId=%s frame=%s "
            "samplePaper=%s ticketPaper=%s whole_lines=%s fields_from_whole=%s fields_reocr=%s",
            index,
            station_name,
            station_id,
            template.templateId,
            frame is not None,
            paper_quad is not None,
            snapped,
            len(whole_lines),
            from_whole,
            from_crop,
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
        return result.model_copy(update={"usedFieldLayouts": used_layouts})

    def _template_ticket_crop(
        self,
        image: np.ndarray,
        region: DetectedRegion,
        source: np.ndarray | None,
        source_scale: float,
    ) -> tuple[ProcessedTicketCrop, bool]:
        """Rectify the ticket out of the original upload along its paper edges.

        ``preview`` keeps the original pixels (what OCR reads and Admin sees);
        ``ocr_ready`` is the enhanced copy used only when the original read
        comes up empty. Returns whether the outline was snapped to the paper.
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
        snapped = None
        if bool(getattr(settings, "TICKET_VISION_TEMPLATE_PAPER_SNAP", True)):
            snapped = paper_outline.refine_paper_quad(src, quad)
        corners = [(int(round(x)), int(round(y))) for x, y in (snapped or quad)]
        warped = image_pipeline.perspective_warp(src, corners)
        preview = image_pipeline.resize_if_needed(
            warped, int(getattr(settings, "TICKET_VISION_TEMPLATE_CANVAS_MAX_DIMENSION", 2400))
        )
        ocr_source = image_pipeline.resize_if_needed(preview, self._max_image_dimension)
        ocr_source = image_pipeline.remove_glare(image_pipeline.upscale_if_too_small(ocr_source))
        ocr_ready = image_pipeline.enhance_for_ocr(ocr_source)
        return ProcessedTicketCrop(preview=preview, ocr_ready=ocr_ready), snapped is not None

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

    def _ocr_template_field(
        self,
        crop: ProcessedTicketCrop,
        region: template_locator.TemplateRegion,
        field_name: str,
        parser: TicketParser,
        expected_length: int | None,
    ) -> list:
        """Read one template box: original pixels first, enhanced copy as retry.

        The crop is padded slightly so edge glyphs survive; the padding is an
        OCR margin only and never reaches the returned field box.
        """
        fallback: list = []
        for canvas in (crop.preview, crop.ocr_ready):
            if canvas is None or canvas.size == 0:
                continue
            height, width = canvas.shape[:2]
            px = template_locator.region_to_pixels(region, width, height)
            if px is None:
                continue
            fx, fy, fw, fh = image_pipeline.expand_bbox(
                px[0], px[1], px[2], px[3], width, height,
                pad_ratio=_TEMPLATE_FIELD_PAD_RATIO,
                min_pad_px=4,
            )
            field_crop = canvas[fy : fy + fh, fx : fx + fw]
            if field_crop.size == 0:
                continue
            lines = self._ocr_region(
                image_pipeline.upscale_if_too_small(field_crop),
                field_hint=field_name,
                already_enhanced=True,
            )
            if lines and parser.normalise_field(field_name, lines, expected_length) is not None:
                return lines
            fallback = fallback or lines
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

    @staticmethod
    def _template_lines_trusted(
        parser: TicketParser,
        field_name: str,
        lines: list[OcrTextResult],
        expected_length: int | None,
    ) -> bool:
        """Whole-ticket lines inside the template box are good enough to skip re-OCR."""
        if max(float(line.confidence) for line in lines) < _TEMPLATE_TRUST_CONFIDENCE:
            return False
        value = parser.normalise_field(field_name, lines, expected_length)
        if value is None:
            return False
        # Digit-only serial reads usually dropped the letter — the allowlist
        # crop recovers it.
        if field_name == "serialNumber" and not any(ch.isalpha() for ch in value):
            return False
        return True

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
