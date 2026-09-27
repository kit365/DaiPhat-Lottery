"""Issuer identified from the printed design when no station text is readable,
before any station OCR template is chosen."""

from __future__ import annotations

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy  # noqa: E402
from domain.preprocessing.pipeline import ProcessedTicketCrop  # noqa: E402
from domain.scanning.ticket_scan_service import TicketScanService, _TemplateContext  # noqa: E402
from domain.stations.models import StationRef  # noqa: E402
from domain.validation.format_validator import FormatValidator  # noqa: E402
from dto.request.scan_metadata import FieldLayoutMetadata, StationTemplateMetadata  # noqa: E402

_TICKET = [(200.0, 200.0), (1000.0, 200.0), (1000.0, 700.0), (200.0, 700.0)]
_STATIONS = [
    StationRef(id=5, name="Vũng Tàu", code="VT"),
    StationRef(id=10, name="Tây Ninh", code="TN"),
]


class _NoOcr(OcrStrategy):
    name = "no-ocr"

    def read_text(self, image, languages=DEFAULT_LANGUAGES, *, field_hint=None):
        return []


def _design(seed: int) -> np.ndarray:
    """A ticket design: blocky print distinctive enough for feature matching."""
    rng = np.random.default_rng(seed)
    blocks = rng.integers(0, 255, size=(50, 80, 3), dtype=np.uint8)
    return cv2.GaussianBlur(cv2.resize(blocks, (800, 500), interpolation=cv2.INTER_NEAREST), (3, 3), 0)


def _upload_with(design: np.ndarray) -> np.ndarray:
    upload = np.full((900, 1200, 3), 90, np.uint8)
    upload[200:700, 200:1000] = design
    return upload


def _template(station_id: int, template_id: int, url: str) -> StationTemplateMetadata:
    return StationTemplateMetadata(
        stationId=station_id,
        templateId=template_id,
        sampleImageUrl=url,
        fieldLayouts=[
            FieldLayoutMetadata(id=template_id * 10, fieldName="numbers", x=0.3, y=0.6, width=0.5, height=0.1)
        ],
    )


def _service(samples: dict[str, np.ndarray]) -> TicketScanService:
    return TicketScanService(
        detector_provider=None,
        ocr_strategy=_NoOcr(),
        validator=FormatValidator(),
        max_file_size_mb=10,
        max_image_dimension=1920,
        station_fuzzy_threshold=80,
        high_confidence_threshold=0.9,
        low_confidence_threshold=0.5,
        include_cropped_image=False,
        template_sample_loader=samples.get,
    )


def _crop() -> ProcessedTicketCrop:
    blank = np.zeros((500, 800, 3), np.uint8)
    return ProcessedTicketCrop(preview=blank, ocr_ready=blank, source_quad=list(_TICKET))


def test_issuer_is_the_station_whose_template_sample_matches_the_ticket():
    tay_ninh, vung_tau = _design(1), _design(2)
    service = _service({"mem://tn-a.jpg": tay_ninh, "mem://vt-a.jpg": vung_tau})
    ctx = _TemplateContext(
        stations=_STATIONS,
        station_templates=[_template(5, 1, "mem://vt-a.jpg"), _template(10, 2, "mem://tn-a.jpg")],
    )

    match = service._identify_station_by_design(ctx, _upload_with(tay_ninh), _crop())

    assert match is not None
    assert match.station.id == 10
    assert match.template.templateId == 2
    assert match.confidence == pytest.approx(0.95)
    # Sample photo (normalized) → upload: the sample ticket lands on the detected ticket.
    corners = cv2.perspectiveTransform(
        np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]).reshape(-1, 1, 2), match.to_upload
    ).reshape(-1, 2)
    assert np.allclose(corners, _TICKET, atol=4)


def test_same_design_for_two_stations_leaves_the_issuer_unknown():
    design = _design(3)
    service = _service({"mem://dup-a.jpg": design, "mem://dup-b.jpg": design.copy()})
    ctx = _TemplateContext(
        stations=_STATIONS,
        station_templates=[_template(5, 3, "mem://dup-a.jpg"), _template(10, 4, "mem://dup-b.jpg")],
    )

    assert service._identify_station_by_design(ctx, _upload_with(design), _crop()) is None


def test_templates_of_inactive_stations_are_not_candidates():
    design = _design(4)
    service = _service({"mem://inactive.jpg": design})
    ctx = _TemplateContext(
        stations=_STATIONS,
        station_templates=[_template(99, 5, "mem://inactive.jpg")],
    )

    assert service._identify_station_by_design(ctx, _upload_with(design), _crop()) is None
