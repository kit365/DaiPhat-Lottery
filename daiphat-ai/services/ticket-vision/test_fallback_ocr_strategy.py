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
