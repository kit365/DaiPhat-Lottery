import uuid
from typing import Callable

import numpy as np

from domain.detection.base import DetectedRegion, TicketDetectorStrategy
from domain.layouts.factory import LayoutStrategyFactory
from domain.ocr.base import OcrStrategy
from domain.parsing.ticket_parser import ParsedTicket, TicketParser
from domain.preprocessing import pipeline as image_pipeline
from domain.preprocessing.pipeline import ProcessedTicketCrop
from domain.scanning.status_resolver import resolve_status
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import BoundingBox, ScanResponse, TicketScanResult
from infra.logger import logger

# Orientation correction (see _correct_orientation): image size fed to each
# per-rotation OCR probe. Kept small since this only needs to compare
# *relative* confidence across candidate rotations, not actually transcribe
# the ticket -- running it at full resolution would multiply the cost of an
# already-expensive OCR pass by up to 4x for no extra benefit.
_ORIENTATION_PROBE_MAX_DIMENSION = 480
# If even the best-scoring candidate in the geometrically-favored axis pair
# (0/180 or 90/270) barely detects any text, the geometric axis guess itself
# may be wrong (a very busy/decorative ticket background can throw off the
# Hough-line heuristic) -- worth also trying the perpendicular pair before
# settling.
_ORIENTATION_MIN_TRUSTED_SCORE = 0.3

# ROI refinement (see _refine_low_confidence_fields): how much of the ticket
# to crop around a field's approximate read location for a second, targeted
# OCR pass. Generous on the x-axis since token width varies a lot (a station
# name is much wider than a 6-digit number) and it's cheaper to include a
# little extra background than to clip the real text.
_ROI_PADDING_Y = 0.06
_ROI_PADDING_X = 0.30
_ROI_UPSCALE_MIN_DIMENSION = 200
# Skip refinement for a field that's already read confidently -- the second
# pass costs an extra OCR call and can only help fields that are actually in
# doubt.
_ROI_REFINEMENT_CONFIDENCE_CEILING = 0.85

# (strategy name, max tickets) -> detector. Injected rather than calling
# TicketDetectorFactory directly so this service stays independent of the
# factory (and tests can hand it a stub without touching OpenCV/YOLO).
DetectorProvider = Callable[[str | None, int | None], TicketDetectorStrategy]


class TicketScanService:
    """Orchestrates one POST /v1/scan request end-to-end (doc section 4,
    Flow 1 pipeline): detect ticket regions -> crop/warp each -> OCR ->
    parse -> Layer-1 validate -> resolve green/yellow/red status.

    One failure in a single detected region must not fail the whole scan --
    other tickets in the same photo are still returned; the failing one is
    dropped with a warning (mobile still sees "N of M tickets processed").
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
        image_pipeline.guard_file_size(image_bytes, self._max_file_size_mb)
        image = image_pipeline.decode_image(image_bytes)
        image = image_pipeline.resize_if_needed(image, self._max_image_dimension)

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

        # Detector is resolved per request, not per process: ScanMetadata lets
        # Java pick the strategy (and cap ticket count) per call, e.g. to A/B
        # the YOLO detector against the contour MVP without a redeploy.
        detector = self._detector_provider(metadata.detectorStrategy, metadata.maxTickets)
        detection_result = detector.detect(image)
        warnings = list(detection_result.warnings)

        tickets: list[TicketScanResult] = []
        for index, region in enumerate(detection_result.regions):
            try:
                tickets.append(
                    self._scan_one_region(image, region, index, parser, expected_lengths_by_code)
                )
            except Exception:  # noqa: BLE001 -- one bad region must not fail the whole scan
                logger.exception("Failed to process detected ticket #%s", index)
                warnings.append(f"Vé #{index}: xử lý thất bại, đã bỏ qua.")

        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
        )

    def _scan_one_region(
        self,
        image: np.ndarray,
        region: DetectedRegion,
        index: int,
        parser: TicketParser,
        expected_lengths_by_code: dict[str, int],
    ) -> TicketScanResult:
        crop = image_pipeline.process_ticket_crop(image, region)
        crop = self._correct_orientation(crop)

        # Station is unknown before OCR runs, so layout selection always
        # resolves to GenericLayoutStrategy for now -- see
        # domain/layouts/base.py docstring for the two-pass idea that would
        # let this use a station-specific layout instead.
        layout = LayoutStrategyFactory.get_for_station(None)
        regions_map = layout.get_regions(crop.ocr_ready)
        # A header/body split shrinks each sub-crop well below the
        # already-upscaled full crop's size (the header band alone can drop
        # under MIN_OCR_CROP_DIMENSION again), starving the text detector on
        # exactly the small, plainly-printed text (station name, draw date)
        # this split was meant to isolate -- re-apply the same upscale
        # safeguard per sub-region before OCR sees it.
        regions_map = {
            name: image_pipeline.upscale_if_too_small(region_image) for name, region_image in regions_map.items()
        }
        ocr_results_by_region = {
            name: self._ocr_strategy.read_text(region_image) for name, region_image in regions_map.items()
        }

        if not any(ocr_results_by_region.values()):
            # The header/body split (GenericLayoutStrategy's fixed 30/70
            # ratio -- uncalibrated, see its docstring) can cut through
            # printed text or leave a band too small for the OCR engines to
            # find anything. Retry once on the whole crop before giving up.
            whole_results = self._ocr_strategy.read_text(crop.ocr_ready)
            if whole_results:
                ocr_results_by_region = {"whole": whole_results}

        parsed: ParsedTicket = parser.parse(ocr_results_by_region, expected_number_length=None)

        # Now that the station may be known, re-parse once more with its
        # exact expected number length if Java supplied one -- cheap, since
        # OCR (the expensive step) already ran and isn't repeated.
        expected_length = expected_lengths_by_code.get(parsed.extracted.stationCode)
        if expected_length is not None:
            parsed = parser.parse(ocr_results_by_region, expected_number_length=expected_length)

        parsed = self._refine_low_confidence_fields(crop, parsed, parser, expected_length)

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

        cropped_image_base64 = (
            image_pipeline.encode_to_base64_jpeg(crop.preview) if self._include_cropped_image else None
        )

        return TicketScanResult(
            ticketIndex=index,
            bbox=bbox,
            status=status,
            confidence=confidence,
            extracted=parsed.extracted,
            fieldConfidences=parsed.field_confidences,
            missingFields=validation.missing_fields,
            validationErrors=validation.errors,
            croppedImageBase64=cropped_image_base64,
        )

    def _correct_orientation(self, crop: ProcessedTicketCrop) -> ProcessedTicketCrop:
        """Correct arbitrary 90-degree-multiple rotation (a sideways or
        fully upside-down photo) before OCR ever sees the ticket.

        Perspective warp (process_ticket_crop) only straightens *skew* -- it
        has no way to know which of the 4 axis-aligned orientations is
        content-upright, since a rotated rectangle looks the same to pure
        geometry. Resolved with a cheap two-stage probe: a geometric guess
        at the text axis (horizontal vs vertical -- pure OpenCV, no OCR),
        then a small downscaled OCR read at both members of that axis pair
        (0/180 or 90/270) to pick whichever one an OCR engine actually reads
        text in. Falls back to trying the other axis pair too if neither
        candidate in the first pair scores above a noise floor -- the
        geometric axis guess itself can be wrong on a very busy/decorative
        ticket background.
        """
        axis_hint = image_pipeline.dominant_text_axis(crop.ocr_ready)
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
            except Exception:  # noqa: BLE001 -- a probe failure just loses that candidate, not the scan
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
        """Re-crop a small, targeted region around each low-confidence
        field's approximate read location and try OCR again on just that.

        A tight, upscaled, single-purpose crop is easier for the text
        detector than the full ticket (no competing decorative art, no
        other fields' text nearby) -- this is the "small clean ROI" half of
        the improved pipeline, done adaptively per-ticket from where the
        first OCR pass actually found each field rather than a fixed,
        uncalibrated set of station-agnostic percentages (Vietnam's ~40
        station designs don't share one layout, so a hand-picked box would
        only ever be right for a handful of them). Only replaces a field's
        value when the re-read is strictly more confident; any failure here
        (bad crop bounds, OCR error, nothing found) just keeps the original
        first-pass result.

        Deliberately skips serialNumber: OCR confidence scores aren't always
        well-calibrated (an engine can be very confident about a wrong short
        alnum read), and serialNumber was already reliably correct before
        this refinement pass existed -- there's much more to lose than gain
        by letting a re-crop-and-reread risk clobbering an already-good
        result for a field that was never the problem.
        """
        height, width = crop.ocr_ready.shape[:2]

        for field_name, (y_pos, x_pos) in list(parsed.field_positions.items()):
            if field_name == "serialNumber":
                continue
            if parsed.field_confidences.get(field_name, 0.0) >= _ROI_REFINEMENT_CONFIDENCE_CEILING:
                continue

            y0 = max(int((y_pos - _ROI_PADDING_Y) * height), 0)
            y1 = min(int((y_pos + _ROI_PADDING_Y) * height), height)
            x0 = max(int((x_pos - _ROI_PADDING_X) * width), 0)
            x1 = min(int((x_pos + _ROI_PADDING_X) * width), width)
            if y1 - y0 < 2 or x1 - x0 < 2:
                continue

            roi = crop.ocr_ready[y0:y1, x0:x1]
            roi = image_pipeline.upscale_if_too_small(roi, _ROI_UPSCALE_MIN_DIMENSION)

            try:
                roi_results = self._ocr_strategy.read_text(roi)
            except Exception:  # noqa: BLE001 -- refinement is best-effort, never fatal to the scan
                continue
            if not roi_results:
                continue

            roi_parsed = parser.parse({"whole": roi_results}, expected_number_length=expected_number_length)
            roi_confidence = roi_parsed.field_confidences.get(field_name, 0.0)
            roi_value = getattr(roi_parsed.extracted, field_name, None)
            original_value = getattr(parsed.extracted, field_name, None) or ""

            # A tight crop risks clipping part of a wide field (a decorative
            # lottery number in particular spans much of the ticket's width)
            # -- OCR then confidently, and wrongly, transcribes only the
            # part it can still see. A refined read that's *shorter* than
            # what pass 1 already found is the signature of exactly that
            # failure, so a higher confidence alone isn't trusted to accept
            # it; length must not regress too.
            if (
                roi_value
                and roi_confidence > parsed.field_confidences.get(field_name, 0.0)
                and len(roi_value) >= len(original_value)
            ):
                setattr(parsed.extracted, field_name, roi_value)
                parsed.field_confidences[field_name] = roi_confidence
                if field_name == "stationName":
                    parsed.extracted.stationCode = roi_parsed.extracted.stationCode

        return parsed
