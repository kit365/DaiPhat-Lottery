import uuid

import numpy as np

from domain.detection.base import DetectedRegion, TicketDetectorStrategy
from domain.layouts.factory import LayoutStrategyFactory
from domain.ocr.base import OcrStrategy
from domain.parsing.ticket_parser import ParsedTicket, TicketParser
from domain.preprocessing import pipeline as image_pipeline
from domain.scanning.status_resolver import resolve_status
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import BoundingBox, ScanResponse, TicketScanResult
from infra.logger import logger


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
        detector: TicketDetectorStrategy,
        ocr_strategy: OcrStrategy,
        validator: FormatValidator,
        max_file_size_mb: int,
        max_image_dimension: int,
        station_fuzzy_threshold: int,
        high_confidence_threshold: float,
        low_confidence_threshold: float,
        include_cropped_image: bool = True,
    ) -> None:
        self._detector = detector
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

        detection_result = self._detector.detect(image)
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

        # Station is unknown before OCR runs, so layout selection always
        # resolves to GenericLayoutStrategy for now -- see
        # domain/layouts/base.py docstring for the two-pass idea that would
        # let this use a station-specific layout instead.
        layout = LayoutStrategyFactory.get_for_station(None)
        regions_map = layout.get_regions(crop.ocr_ready)
        ocr_results_by_region = {
            name: self._ocr_strategy.read_text(region_image) for name, region_image in regions_map.items()
        }

        parsed: ParsedTicket = parser.parse(ocr_results_by_region, expected_number_length=None)

        # Now that the station may be known, re-parse once more with its
        # exact expected number length if Java supplied one -- cheap, since
        # OCR (the expensive step) already ran and isn't repeated.
        expected_length = expected_lengths_by_code.get(parsed.extracted.stationCode)
        if expected_length is not None:
            parsed = parser.parse(ocr_results_by_region, expected_number_length=expected_length)

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
