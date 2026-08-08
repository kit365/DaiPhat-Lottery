import numpy as np
import pytest

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.parsing.ticket_parser import TicketParser
from domain.stations.matcher import StationMatcher
from conftest import StubOcrStrategy

# Requires opencv-python-headless + numpy to be installed -- see README.md
# "Local setup" for why they aren't available in every environment.
cv2_numpy = pytest.importorskip("cv2")

from domain.preprocessing.pipeline import ProcessedTicketCrop  # noqa: E402
from domain.scanning.ticket_scan_service import TicketScanService  # noqa: E402


def _service(ocr_strategy: OcrStrategy) -> TicketScanService:
    # detector/validator aren't exercised by the private methods under test
    # here (_correct_orientation, _refine_low_confidence_fields both operate
    # only on an already-cropped image and the OCR strategy).
    return TicketScanService(
        detector=None,
        ocr_strategy=ocr_strategy,
        validator=None,
        max_file_size_mb=10,
        max_image_dimension=1920,
        station_fuzzy_threshold=80,
        high_confidence_threshold=0.9,
        low_confidence_threshold=0.5,
    )


class _MarkerAwareStub(OcrStrategy):
    """Scores an image by whether a bright marker pixel sits at its
    top-left corner -- lets a test assert which rotation candidate
    TicketScanService actually picked without needing a real OCR engine."""

    name = "marker-aware-stub"

    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        marker_is_bright = image[0, 0] > 128 if image.ndim == 2 else bool(image[0, 0].mean() > 128)
        return [OcrTextResult(text="marker", confidence=0.9 if marker_is_bright else 0.1)]


def test_correct_orientation_picks_the_rotation_the_ocr_engine_reads_best():
    # Blank aside from one marker pixel -- Hough finds no text-like lines,
    # so dominant_text_axis defaults to 0, making the primary candidate
    # pair (0, 180). The marker starts at the bottom-right corner; only the
    # 180-degree candidate moves it to the top-left, which is what the
    # marker-aware stub scores highest.
    ocr_ready = np.zeros((40, 60), dtype=np.uint8)
    ocr_ready[-1, -1] = 255
    preview = np.zeros((40, 60, 3), dtype=np.uint8)
    crop = ProcessedTicketCrop(preview=preview, ocr_ready=ocr_ready)

    service = _service(_MarkerAwareStub())

    corrected = service._correct_orientation(crop)

    assert corrected.ocr_ready[0, 0] == 255


def test_correct_orientation_is_a_no_op_when_every_candidate_scores_equally():
    # A stub that ignores the image entirely and always returns the same
    # result can't distinguish any rotation -- ties must not cause a
    # spurious rotation (regression guard for the >/>= comparison in
    # _best_orientation).
    crop = ProcessedTicketCrop(
        preview=np.zeros((40, 60, 3), dtype=np.uint8),
        ocr_ready=np.zeros((40, 60), dtype=np.uint8),
    )
    service = _service(StubOcrStrategy("stub", results=[OcrTextResult(text="x", confidence=0.9)]))

    corrected = service._correct_orientation(crop)

    assert corrected.ocr_ready.shape == crop.ocr_ready.shape
    assert (corrected.ocr_ready == crop.ocr_ready).all()


def test_refine_low_confidence_fields_adopts_a_strictly_better_roi_read(sample_stations):
    service = _service(StubOcrStrategy("stub", results=[OcrTextResult(text="654321", confidence=0.95)]))
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)

    parsed = parser.parse({"body": [OcrTextResult(text="654321", confidence=0.4)]})
    assert parsed.field_confidences["numbers"] == 0.4

    crop = ProcessedTicketCrop(
        preview=np.zeros((100, 100, 3), dtype=np.uint8),
        ocr_ready=np.zeros((100, 100), dtype=np.uint8),
    )

    refined = service._refine_low_confidence_fields(crop, parsed, parser, expected_number_length=None)

    assert refined.extracted.numbers == "654321"
    assert refined.field_confidences["numbers"] == 0.95


def test_refine_low_confidence_fields_rejects_a_confidently_truncated_roi_read(sample_stations):
    # Regression test: a real ticket's decorative lottery number spans much
    # of the ticket's width, wider than the padded ROI window centered on
    # one fragment's position. When the crop clips the leading digits, OCR
    # transcribes only what it can still see and can be MORE confident about
    # the (wrong, truncated) remainder than it was about the full original
    # read -- "298407" must not be replaced by a confidently-read "8407".
    service = _service(StubOcrStrategy("stub", results=[OcrTextResult(text="8407", confidence=0.99)]))
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)

    parsed = parser.parse({"body": [OcrTextResult(text="298407", confidence=0.65)]})
    assert parsed.extracted.numbers == "298407"

    crop = ProcessedTicketCrop(
        preview=np.zeros((100, 100, 3), dtype=np.uint8),
        ocr_ready=np.zeros((100, 100), dtype=np.uint8),
    )

    refined = service._refine_low_confidence_fields(crop, parsed, parser, expected_number_length=None)

    assert refined.extracted.numbers == "298407"
    assert refined.field_confidences["numbers"] == 0.65


def test_refine_low_confidence_fields_keeps_the_original_when_roi_read_is_not_better(sample_stations):
    # A deterministic stub that always returns the exact same result the
    # first pass already saw must never "improve" on itself.
    service = _service(StubOcrStrategy("stub", results=[OcrTextResult(text="123456", confidence=0.5)]))
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)

    parsed = parser.parse({"body": [OcrTextResult(text="123456", confidence=0.5)]})

    crop = ProcessedTicketCrop(
        preview=np.zeros((100, 100, 3), dtype=np.uint8),
        ocr_ready=np.zeros((100, 100), dtype=np.uint8),
    )

    refined = service._refine_low_confidence_fields(crop, parsed, parser, expected_number_length=None)

    assert refined.extracted.numbers == "123456"
    assert refined.field_confidences["numbers"] == 0.5


def test_refine_low_confidence_fields_skips_fields_already_above_the_ceiling(sample_stations):
    # A field read confidently enough on the first pass shouldn't trigger a
    # second OCR call at all.
    ocr_strategy = StubOcrStrategy("stub", results=[OcrTextResult(text="000000", confidence=0.99)])
    service = _service(ocr_strategy)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)

    parsed = parser.parse({"body": [OcrTextResult(text="123456", confidence=0.9)]})
    assert parsed.field_confidences["numbers"] == 0.9

    crop = ProcessedTicketCrop(
        preview=np.zeros((100, 100, 3), dtype=np.uint8),
        ocr_ready=np.zeros((100, 100), dtype=np.uint8),
    )

    refined = service._refine_low_confidence_fields(crop, parsed, parser, expected_number_length=None)

    assert refined.extracted.numbers == "123456"
    assert ocr_strategy.call_count == 0
