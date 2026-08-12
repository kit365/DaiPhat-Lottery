from pathlib import Path

import numpy as np
import pytest

from domain.detection.contour_detector import ContourTicketDetector
from domain.detection.factory import TicketDetectorFactory, resolve_model_path
from domain.detection.ordering import cap_to_max_tickets, order_corners, sort_reading_order
from domain.detection.base import DetectedRegion
from domain.detection.yolo_obb_detector import YoloObbTicketDetector
from infra.config import settings


# Mirrors the real trained model: the whole ticket plus per-field classes.
_CLASS_NAMES = {
    0: "Lottery-QR-Scan",
    1: "Lottery-Station",
    2: "Lottery-Ticket-Serial",
    3: "Lottery-ticket",
    4: "drawDate",
    5: "drawDays",
    6: "lottery station logo",
    7: "lotteryNumber",
    8: "price",
}
_TICKET_CLASS_ID = 3


class _FakeObb:
    """Stands in for ultralytics' Results.obb -- plain ndarrays instead of
    torch tensors, which is enough for the detector's conversion logic."""

    def __init__(self, quads, boxes, cls=None):
        self.xyxyxyxy = np.asarray(quads, dtype="float32")
        self.xyxy = np.asarray(boxes, dtype="float32")
        # Default everything to the ticket class so tests that don't care
        # about class filtering stay readable.
        self.cls = np.asarray(
            cls if cls is not None else [_TICKET_CLASS_ID] * len(self.xyxy), dtype="float32"
        )

    def __len__(self):
        return len(self.xyxy)


class _FakeResult:
    def __init__(self, obb, names=None):
        self.obb = obb
        self.names = names if names is not None else _CLASS_NAMES


class _FakeModel:
    """Test double for ultralytics.YOLO: records predict() kwargs and
    returns a pre-scripted detection, so the whole detector can be tested
    without weights, ultralytics or torch installed."""

    def __init__(self, result):
        self._result = result
        self.predict_kwargs = None

    def predict(self, image, **kwargs):
        self.predict_kwargs = kwargs
        return [self._result]


def _detector(model, max_tickets: int = 15) -> YoloObbTicketDetector:
    detector = YoloObbTicketDetector(
        model_path="unused-in-tests.pt",
        confidence_threshold=0.35,
        iou_threshold=0.45,
        device="cpu",
        max_tickets=max_tickets,
        ticket_class="Lottery-ticket",
    )
    detector._model = model  # skip lazy loading -- no weights in tests
    return detector


def _image(width: int = 1200, height: int = 900) -> np.ndarray:
    return np.zeros((height, width, 3), dtype=np.uint8)


def test_converts_an_obb_into_bbox_and_ordered_corners():
    # Axis-aligned ticket at (100, 80), 300x600, but with the quad's points
    # given starting from the bottom-right -- an OBB's point order follows
    # the box's rotation, not image-space TL/TR/BR/BL.
    quad = [[400, 680], [100, 680], [100, 80], [400, 80]]
    model = _FakeModel(_FakeResult(_FakeObb([quad], [[100, 80, 400, 680]])))

    result = _detector(model).detect(_image())

    assert len(result.regions) == 1
    region = result.regions[0]
    assert region.bbox == (100, 80, 300, 600)
    # Re-ordered to TL, TR, BR, BL regardless of the input order.
    assert region.corners == [(100, 80), (400, 80), (400, 680), (100, 680)]


def test_passes_configured_thresholds_to_predict():
    model = _FakeModel(_FakeResult(_FakeObb([], [])))

    _detector(model).detect(_image())

    assert model.predict_kwargs["conf"] == 0.35
    assert model.predict_kwargs["iou"] == 0.45
    assert model.predict_kwargs["device"] == "cpu"


def test_returns_no_regions_when_the_model_finds_nothing():
    model = _FakeModel(_FakeResult(_FakeObb([], [])))

    result = _detector(model).detect(_image())

    assert result.regions == []
    assert result.warnings == []


def test_clamps_boxes_that_extend_past_the_frame_edge():
    # A ticket predicted slightly outside the image would otherwise slice an
    # empty crop out of the source array.
    quad = [[-20, -10], [400, -10], [400, 600], [-20, 600]]
    model = _FakeModel(_FakeResult(_FakeObb([quad], [[-20, -10, 400, 600]])))

    result = _detector(model).detect(_image())

    x, y, w, h = result.regions[0].bbox
    assert (x, y) == (0, 0)
    assert w == 400 and h == 600


def test_orders_detections_in_reading_order():
    # Right ticket returned first by the model; both sit in the same row.
    right = [[900, 100], [1150, 100], [1150, 600], [900, 600]]
    left = [[100, 100], [350, 100], [350, 600], [100, 600]]
    model = _FakeModel(
        _FakeResult(_FakeObb([right, left], [[900, 100, 1150, 600], [100, 100, 350, 600]]))
    )

    result = _detector(model).detect(_image(width=1600))

    assert [r.bbox[0] for r in result.regions] == [100, 900]


def test_caps_detections_at_max_tickets_and_warns():
    quads, boxes = [], []
    for i in range(20):
        x = 50 + i * 10
        quads.append([[x, 100], [x + 40, 100], [x + 40, 300], [x, 300]])
        boxes.append([x, 100, x + 40, 300])
    model = _FakeModel(_FakeResult(_FakeObb(quads, boxes)))

    result = _detector(model, max_tickets=15).detect(_image(width=2400))

    assert len(result.regions) == 15
    assert any("15" in warning for warning in result.warnings)


def test_keeps_only_whole_ticket_detections():
    # The model also boxes fields *inside* a ticket; returning those as
    # tickets would report one photo of 1 ticket as 4 separate tickets.
    ticket = [[100, 80], [400, 80], [400, 680], [100, 680]]
    field = [[120, 100], [300, 100], [300, 140], [120, 140]]
    model = _FakeModel(
        _FakeResult(
            _FakeObb(
                [ticket, field, field, field],
                [[100, 80, 400, 680], [120, 100, 300, 140], [120, 100, 300, 140], [120, 100, 300, 140]],
                cls=[_TICKET_CLASS_ID, 1, 4, 7],  # ticket, station, drawDate, lotteryNumber
            )
        )
    )

    result = _detector(model).detect(_image())

    assert len(result.regions) == 1
    assert result.regions[0].bbox == (100, 80, 300, 600)


def test_keeps_every_detection_when_the_ticket_class_is_missing_from_the_model():
    # A retrain that renames the class must not silently yield zero tickets.
    quad = [[100, 80], [400, 80], [400, 680], [100, 680]]
    model = _FakeModel(
        _FakeResult(_FakeObb([quad], [[100, 80, 400, 680]], cls=[0]), names={0: "renamed-class"})
    )

    result = _detector(model).detect(_image())

    assert len(result.regions) == 1


def test_factory_falls_back_to_contour_when_weights_are_missing(monkeypatch):
    # Points at a path that cannot exist so the test is independent of
    # whether a real models/best.pt happens to be present in the checkout.
    monkeypatch.setattr(settings, "TICKET_VISION_YOLO_MODEL_PATH", "models/does-not-exist.pt")

    detector = TicketDetectorFactory.create("yolov8_obb")

    assert isinstance(detector, ContourTicketDetector)


def test_factory_returns_the_yolo_detector_when_weights_are_present(monkeypatch):
    monkeypatch.setattr(YoloObbTicketDetector, "is_available", classmethod(lambda cls, path: True))

    detector = TicketDetectorFactory.create("yolov8_obb")

    assert isinstance(detector, YoloObbTicketDetector)
    assert detector.ticket_class == settings.TICKET_VISION_YOLO_TICKET_CLASS


def test_factory_reuses_one_yolo_detector_instance(monkeypatch):
    # The detector caches a loaded model; a new instance per request would
    # reload the weights on every scan.
    monkeypatch.setattr(YoloObbTicketDetector, "is_available", classmethod(lambda cls, path: True))

    assert TicketDetectorFactory.create("yolov8_obb") is TicketDetectorFactory.create("yolov8_obb")


def test_factory_falls_back_to_contour_for_an_unknown_strategy():
    detector = TicketDetectorFactory.create("something-else")

    assert isinstance(detector, ContourTicketDetector)


def test_factory_honours_a_max_tickets_override():
    detector = TicketDetectorFactory.create(None, 3)

    assert detector.max_tickets == 3


def test_resolve_model_path_makes_relative_paths_service_relative():
    resolved = resolve_model_path("models/best.pt")

    assert resolved.replace("\\", "/").endswith("services/ticket-vision/models/best.pt")


def test_resolve_model_path_passes_absolute_paths_through():
    # Built from the platform's own root so this holds on POSIX and Windows
    # alike ("/opt/..." has no drive letter, so it isn't absolute on Windows).
    absolute = str(Path("models/best.pt").resolve())

    assert resolve_model_path(absolute) == absolute


@pytest.mark.parametrize(
    "points",
    [
        [[100, 80], [400, 80], [400, 680], [100, 680]],  # already TL,TR,BR,BL
        [[400, 680], [100, 680], [100, 80], [400, 80]],  # rotated start
        [[100, 680], [100, 80], [400, 80], [400, 680]],  # counter-clockwise
    ],
)
def test_order_corners_is_invariant_to_input_point_order(points):
    ordered = order_corners(np.asarray(points, dtype="float32"))

    assert ordered == [(100, 80), (400, 80), (400, 680), (100, 680)]


def test_sort_reading_order_groups_rows_before_columns():
    top_right = DetectedRegion(bbox=(900, 100, 250, 500), corners=[])
    top_left = DetectedRegion(bbox=(100, 100, 250, 500), corners=[])
    bottom = DetectedRegion(bbox=(500, 700, 250, 500), corners=[])

    ordered = sort_reading_order([bottom, top_right, top_left])

    assert ordered == [top_left, top_right, bottom]


def test_cap_to_max_tickets_is_a_no_op_under_the_limit():
    regions = [DetectedRegion(bbox=(0, 0, 10, 20), corners=[])]

    kept, warnings = cap_to_max_tickets(regions, 15)

    assert kept == regions
    assert warnings == []
