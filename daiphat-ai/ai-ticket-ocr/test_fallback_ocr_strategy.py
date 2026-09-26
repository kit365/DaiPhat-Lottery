from domain.ocr.base import OcrTextResult
from domain.ocr.fallback_strategy import FallbackOcrStrategy
from conftest import StubOcrStrategy

HIGH_CONF = [OcrTextResult(text="ok", confidence=0.95)]
LOW_CONF = [OcrTextResult(text="ok?", confidence=0.3)]
BETTER_LOW_CONF = [OcrTextResult(text="ok", confidence=0.6)]


def test_high_confidence_primary_result_is_returned_without_calling_fallback(blank_image):
    primary = StubOcrStrategy("easyocr", results=HIGH_CONF)
    fallback = StubOcrStrategy("paddleocr", results=LOW_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    result = strategy.read_text(blank_image)

    assert result == HIGH_CONF
    assert fallback.call_count == 0


def test_primary_exception_triggers_fallback(blank_image):
    primary = StubOcrStrategy("easyocr", error=RuntimeError("model not loaded"))
    fallback = StubOcrStrategy("paddleocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    result = strategy.read_text(blank_image)

    assert result == HIGH_CONF
    assert fallback.call_count == 1


def test_low_confidence_primary_falls_back_when_fallback_is_better(blank_image):
    primary = StubOcrStrategy("easyocr", results=LOW_CONF)
    fallback = StubOcrStrategy("paddleocr", results=BETTER_LOW_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    result = strategy.read_text(blank_image)

    assert result == BETTER_LOW_CONF


def test_low_confidence_primary_keeps_primary_when_fallback_is_worse(blank_image):
    primary = StubOcrStrategy("easyocr", results=BETTER_LOW_CONF)  # avg 0.6
    fallback = StubOcrStrategy("paddleocr", results=LOW_CONF)  # avg 0.3
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    result = strategy.read_text(blank_image)

    assert result == BETTER_LOW_CONF


def test_both_engines_failing_returns_empty_list_not_an_exception(blank_image):
    primary = StubOcrStrategy("easyocr", error=RuntimeError("boom"))
    fallback = StubOcrStrategy("paddleocr", error=RuntimeError("boom too"))
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    result = strategy.read_text(blank_image)

    assert result == []


def test_fallback_disabled_keeps_low_confidence_primary(blank_image):
    primary = StubOcrStrategy("easyocr", results=LOW_CONF)
    fallback = StubOcrStrategy("paddleocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7, enable_fallback=False)

    result = strategy.read_text(blank_image)

    assert result == LOW_CONF
    assert fallback.call_count == 0


def test_primary_permanent_failure_skips_primary_on_next_call(blank_image):
    primary = StubOcrStrategy(
        "paddleocr",
        error=RuntimeError(
            "disabling paddle for this process after runtime error: "
            "ConvertPirAttribute2RuntimeAttribute not support"
        ),
    )
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    first = strategy.read_text(blank_image)
    second = strategy.read_text(blank_image)

    assert first == HIGH_CONF
    assert second == HIGH_CONF
    assert primary.call_count == 1  # second call skips poisoned primary
    assert fallback.call_count == 2


def test_emergency_fallback_when_soft_fallback_disabled(blank_image):
    """Paddle poison must still reach EasyOCR even if soft fallback is off."""
    primary = StubOcrStrategy(
        "paddleocr",
        error=RuntimeError(
            "disabling paddle for this process after runtime error: "
            "(Unimplemented) ConvertPirAttribute2RuntimeAttribute onednn"
        ),
    )
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=False
    )

    first = strategy.read_text(blank_image)
    second = strategy.read_text(blank_image)

    assert first == HIGH_CONF
    assert second == HIGH_CONF
    assert primary.call_count == 1
    assert fallback.call_count == 2


def test_soft_fallback_still_disabled_for_low_confidence(blank_image):
    primary = StubOcrStrategy("paddleocr", results=LOW_CONF)
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=False
    )

    result = strategy.read_text(blank_image)

    assert result == LOW_CONF
    assert fallback.call_count == 0


def test_empty_primary_does_not_call_easyocr_when_fallback_disabled(blank_image):
    """TICKET_VISION_ENABLE_OCR_FALLBACK=false must not ghost-invoke EasyOCR."""
    primary = StubOcrStrategy("paddleocr", results=[])
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=False
    )

    result = strategy.read_text(blank_image)

    assert result == []
    assert fallback.call_count == 0


def test_empty_field_crop_stays_empty_when_fallback_disabled(blank_image):
    primary = StubOcrStrategy("paddleocr", results=[])
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=False
    )

    result = strategy.read_text(blank_image, field_hint="numbers")

    assert result == []
    assert fallback.call_count == 0


def test_empty_primary_falls_back_when_fallback_enabled(blank_image):
    primary = StubOcrStrategy("paddleocr", results=[])
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=True
    )

    result = strategy.read_text(blank_image, field_hint="serialNumber")

    assert result == HIGH_CONF
    assert fallback.call_count == 1


def test_allowlist_does_not_prefer_easyocr_when_fallback_disabled(blank_image):
    primary = StubOcrStrategy("paddleocr", results=LOW_CONF)
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=False
    )

    result = strategy.read_text(
        blank_image, field_hint="serialNumber", allowlist="0123456789ABCDEF"
    )

    assert result == LOW_CONF
    assert fallback.call_count == 0
    assert primary.call_count == 1


def test_allowlist_prefers_easyocr_when_fallback_enabled(blank_image):
    primary = StubOcrStrategy("paddleocr", results=LOW_CONF)
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(
        primary, fallback, low_confidence_threshold=0.7, enable_fallback=True
    )

    result = strategy.read_text(
        blank_image, field_hint="serialNumber", allowlist="0123456789ABCDEF"
    )

    assert result == HIGH_CONF
    assert fallback.call_count == 1
    assert fallback.last_allowlist == "0123456789ABCDEF"


def test_tuple_index_failure_disables_primary_paddle(blank_image):
    primary = StubOcrStrategy(
        "paddleocr",
        error=IndexError("tuple index out of range"),
    )
    fallback = StubOcrStrategy("easyocr", results=HIGH_CONF)
    strategy = FallbackOcrStrategy(primary, fallback, low_confidence_threshold=0.7)

    first = strategy.read_text(blank_image)
    second = strategy.read_text(blank_image)

    assert first == HIGH_CONF
    assert second == HIGH_CONF
    assert primary.call_count == 1
    assert fallback.call_count == 2
