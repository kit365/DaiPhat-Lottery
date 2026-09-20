from domain.ocr.base import OcrTextResult
from domain.ocr.field_aware_strategy import FieldAwareOcrStrategy
from domain.ocr.specialized_field_ocr import SpecializedFieldOcrStrategy
from conftest import StubOcrStrategy

HIGH = [OcrTextResult(text="32TV17", confidence=0.95)]
LOW = [OcrTextResult(text="??", confidence=0.2)]
BETTER = [OcrTextResult(text="32TV17", confidence=0.8)]


class _RecordingSpecialized(SpecializedFieldOcrStrategy):
    """Stub specialized engine that records field hints and returns scripted results."""

    def __init__(self, results_by_field: dict[str, list[OcrTextResult]], error_fields: set[str] | None = None):
        # Bypass real EasyOCR init — we override read_text entirely.
        self.field_allowlists = {k: "0123456789" for k in results_by_field}
        self.onnx_model_paths = {}
        self._onnx_warned = set()
        self._results_by_field = results_by_field
        self._error_fields = error_fields or set()
        self.hints: list[str | None] = []

    def supports(self, field_hint: str | None) -> bool:
        return field_hint in self._results_by_field

    def read_text(self, image, languages=None, *, field_hint=None):
        self.hints.append(field_hint)
        if field_hint in self._error_fields:
            raise RuntimeError("specialized boom")
        return list(self._results_by_field.get(field_hint or "", []))


def test_field_aware_uses_specialized_when_confident(blank_image):
    specialized = _RecordingSpecialized({"serialNumber": HIGH})
    general = StubOcrStrategy("general", results=LOW)
    strategy = FieldAwareOcrStrategy(
        general=general,
        specialized=specialized,
        specialized_fields=frozenset({"serialNumber", "numbers"}),
        low_confidence_threshold=0.7,
    )

    result = strategy.read_text(blank_image, field_hint="serialNumber")

    assert result == HIGH
    assert general.call_count == 0
    assert specialized.hints == ["serialNumber"]


def test_field_aware_falls_back_to_general_on_low_confidence(blank_image):
    specialized = _RecordingSpecialized({"serialNumber": LOW})
    general = StubOcrStrategy("general", results=BETTER)
    strategy = FieldAwareOcrStrategy(
        general=general,
        specialized=specialized,
        specialized_fields=frozenset({"serialNumber"}),
        low_confidence_threshold=0.7,
    )

    result = strategy.read_text(blank_image, field_hint="serialNumber")

    assert result == BETTER
    assert general.call_count == 1


def test_field_aware_falls_back_when_specialized_raises(blank_image):
    specialized = _RecordingSpecialized({"serialNumber": HIGH}, error_fields={"serialNumber"})
    general = StubOcrStrategy("general", results=HIGH)
    strategy = FieldAwareOcrStrategy(
        general=general,
        specialized=specialized,
        specialized_fields=frozenset({"serialNumber"}),
        low_confidence_threshold=0.7,
    )

    result = strategy.read_text(blank_image, field_hint="serialNumber")

    assert result == HIGH
    assert general.call_count == 1


def test_field_aware_skips_specialized_for_unknown_field(blank_image):
    specialized = _RecordingSpecialized({"serialNumber": HIGH})
    general = StubOcrStrategy("general", results=LOW)
    strategy = FieldAwareOcrStrategy(
        general=general,
        specialized=specialized,
        specialized_fields=frozenset({"serialNumber"}),
        low_confidence_threshold=0.7,
    )

    result = strategy.read_text(blank_image, field_hint="stationName")

    assert result == LOW
    assert specialized.hints == []
    assert general.call_count == 1


def test_field_aware_skips_specialized_without_hint(blank_image):
    specialized = _RecordingSpecialized({"serialNumber": HIGH})
    general = StubOcrStrategy("general", results=LOW)
    strategy = FieldAwareOcrStrategy(
        general=general,
        specialized=specialized,
        specialized_fields=frozenset({"serialNumber"}),
        low_confidence_threshold=0.7,
    )

    result = strategy.read_text(blank_image)

    assert result == LOW
    assert specialized.hints == []


def test_specialized_supports_known_fields():
    strategy = SpecializedFieldOcrStrategy(easyocr=StubOcrStrategy("easy"))  # type: ignore[arg-type]
    assert strategy.supports("serialNumber")
    assert strategy.supports("numbers")
    assert strategy.supports("drawDate")
    assert not strategy.supports("stationName")
    assert not strategy.supports(None)


def test_specialized_onnx_missing_soft_skips_to_allowlist(blank_image, monkeypatch):
    calls: list[dict] = []

    class _EasyStub(StubOcrStrategy):
        def read_text(self, image, languages=None, *, field_hint=None, allowlist=None):
            calls.append({"field_hint": field_hint, "allowlist": allowlist})
            return HIGH

    strategy = SpecializedFieldOcrStrategy(
        easyocr=_EasyStub("easy"),  # type: ignore[arg-type]
        onnx_model_paths={"serialNumber": "models/field_ocr/does_not_exist.onnx"},
    )
    result = strategy.read_text(blank_image, field_hint="serialNumber")

    assert result == HIGH
    assert calls and calls[0]["allowlist"]
    assert "0" in calls[0]["allowlist"]
