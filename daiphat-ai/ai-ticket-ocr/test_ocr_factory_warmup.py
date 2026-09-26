"""Unit tests for OCR factory warmup (no live EasyOCR/Paddle models)."""

from domain.ocr import factory as ocr_factory


def test_warmup_skips_when_disabled(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_WARMUP_ON_STARTUP", False
    )
    monkeypatch.setattr(
        ocr_factory._easyocr,
        "warmup",
        lambda languages=None: calls.append("easy"),
    )
    monkeypatch.setattr(
        ocr_factory._paddleocr,
        "warmup",
        lambda languages=None: calls.append("paddle"),
    )

    ocr_factory.warmup_ocr_engines()

    assert calls == []


def test_warmup_paddle_primary_then_easyocr(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_WARMUP_ON_STARTUP", True
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_PRIMARY_ENGINE", "paddle"
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_ENABLE_OCR_FALLBACK", True
    )
    monkeypatch.setattr(
        ocr_factory._easyocr,
        "warmup",
        lambda languages=None: calls.append("easy"),
    )
    monkeypatch.setattr(
        ocr_factory._paddleocr,
        "warmup",
        lambda languages=None: calls.append("paddle"),
    )

    ocr_factory.warmup_ocr_engines()

    assert calls == ["paddle", "easy"]


def test_warmup_paddle_only_when_fallback_off(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_WARMUP_ON_STARTUP", True
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_PRIMARY_ENGINE", "paddle"
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_ENABLE_OCR_FALLBACK", False
    )
    monkeypatch.setattr(
        ocr_factory._easyocr,
        "warmup",
        lambda languages=None: calls.append("easy"),
    )
    monkeypatch.setattr(
        ocr_factory._paddleocr,
        "warmup",
        lambda languages=None: calls.append("paddle"),
    )

    ocr_factory.warmup_ocr_engines()

    assert calls == ["paddle"]


def test_warmup_easyocr_only_when_paddle_fallback_off(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_WARMUP_ON_STARTUP", True
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_PRIMARY_ENGINE", "easyocr"
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_ENABLE_OCR_FALLBACK", False
    )
    monkeypatch.setattr(
        ocr_factory._easyocr,
        "warmup",
        lambda languages=None: calls.append("easy"),
    )
    monkeypatch.setattr(
        ocr_factory._paddleocr,
        "warmup",
        lambda languages=None: calls.append("paddle"),
    )

    ocr_factory.warmup_ocr_engines()

    assert calls == ["easy"]


def test_warmup_includes_paddle_when_fallback_on(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_WARMUP_ON_STARTUP", True
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_OCR_PRIMARY_ENGINE", "easyocr"
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_ENABLE_OCR_FALLBACK", True
    )
    monkeypatch.setattr(
        ocr_factory._easyocr,
        "warmup",
        lambda languages=None: calls.append("easy"),
    )
    monkeypatch.setattr(
        ocr_factory._paddleocr,
        "warmup",
        lambda languages=None: calls.append("paddle"),
    )

    ocr_factory.warmup_ocr_engines()

    assert calls == ["easy", "paddle"]
