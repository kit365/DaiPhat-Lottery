"""Tests for YOLO + template merge guidance on the LLM scan path."""

from __future__ import annotations

import numpy as np
import pytest

from domain.layouts.yolo_field_layout import DEFAULT_CLASS_TO_FIELD
from domain.scanning import yolo_llm_guidance as guidance_mod
from domain.scanning.yolo_llm_guidance import (
    GROQ_MAX_EXTRA_IMAGES,
    YOLO_FIELD_CROP_PREFIX,
    YOLO_TICKET_CROP_PREFIX,
    YoloLlmGuidance,
    build_yolo_llm_guidance,
    limit_vision_extra_images,
    merge_yolo_and_template_guidance,
)


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


class _FakeObb:
    def __init__(self, boxes, cls, conf=None):
        self.xyxy = np.asarray(boxes, dtype="float32")
        self.cls = np.asarray(cls, dtype="float32")
        self.conf = np.asarray(conf if conf is not None else [0.9] * len(cls), dtype="float32")

    def __len__(self):
        return len(self.xyxy)


class _FakeResult:
    def __init__(self, obb, names=None):
        self.obb = obb
        self.names = names if names is not None else _CLASS_NAMES


class _FakeModel:
    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error

    def predict(self, image, **kwargs):
        if self._error is not None:
            raise self._error
        return [self._result]


@pytest.fixture
def image() -> np.ndarray:
    return np.zeros((600, 300, 3), dtype=np.uint8)


def test_default_class_mapping_covers_required_fields():
    mapped = set(DEFAULT_CLASS_TO_FIELD.values())
    assert {"stationName", "serialNumber", "numbers", "drawDate"}.issubset(mapped)


def test_build_yolo_llm_guidance_returns_ticket_and_field_crops(image, monkeypatch):
    monkeypatch.setattr(guidance_mod.settings, "TICKET_VISION_LLM_YOLO_GUIDANCE", True)
    monkeypatch.setattr(guidance_mod.yolo_model, "is_available", lambda _path: True)
    monkeypatch.setattr(
        guidance_mod.yolo_model,
        "load_model",
        lambda _path: _FakeModel(
            _FakeResult(
                _FakeObb(
                    boxes=[
                        [10, 10, 290, 590],  # ticket
                        [20, 20, 280, 70],  # station
                        [30, 300, 270, 360],  # numbers
                        [40, 500, 260, 540],  # serial
                    ],
                    cls=[3, 1, 7, 2],
                )
            )
        ),
    )

    result = build_yolo_llm_guidance(image, max_tickets=5)

    assert result.ticket_count == 1
    assert result.fields_covered == {"stationName", "numbers", "serialNumber"}
    labels = [label for label, _ in result.crops]
    assert f"{YOLO_TICKET_CROP_PREFIX}0" in labels
    assert f"{YOLO_FIELD_CROP_PREFIX}stationName" in labels
    assert f"{YOLO_FIELD_CROP_PREFIX}numbers" in labels
    assert f"{YOLO_FIELD_CROP_PREFIX}serialNumber" in labels
    assert result.hint is not None
    assert "stationName" in result.hint


def test_build_yolo_llm_guidance_skips_when_disabled(image, monkeypatch):
    monkeypatch.setattr(guidance_mod.settings, "TICKET_VISION_LLM_YOLO_GUIDANCE", False)
    result = build_yolo_llm_guidance(image, max_tickets=5)
    assert result.crops == []
    assert result.fields_covered == set()


def test_build_yolo_llm_guidance_soft_fails_on_inference_error(image, monkeypatch):
    monkeypatch.setattr(guidance_mod.settings, "TICKET_VISION_LLM_YOLO_GUIDANCE", True)
    monkeypatch.setattr(guidance_mod.yolo_model, "is_available", lambda _path: True)
    monkeypatch.setattr(
        guidance_mod.yolo_model,
        "load_model",
        lambda _path: _FakeModel(error=RuntimeError("boom")),
    )
    result = build_yolo_llm_guidance(image, max_tickets=5)
    assert result.crops == []


def test_merge_rule_a_yolo_wins_template_fills_gaps():
    yolo = YoloLlmGuidance(
        hint="- serialNumber (yolo): x=1",
        crops=[(f"{YOLO_FIELD_CROP_PREFIX}serialNumber", b"yolo-serial")],
        fields_covered={"serialNumber"},
    )
    template_crops = [
        ("field-crop:serialNumber:p1:id9", b"template-serial"),
        ("field-crop:drawDate:p1:id10", b"template-date"),
        ("field-crop:numbers:p2:id11", b"template-numbers"),
    ]
    hint, crops = merge_yolo_and_template_guidance(
        yolo,
        "- drawDate priority=1: x=2",
        template_crops,
    )

    labels = [label for label, _ in crops]
    assert f"{YOLO_FIELD_CROP_PREFIX}serialNumber" in labels
    assert "field-crop:serialNumber:p1:id9" not in labels
    assert "field-crop:drawDate:p1:id10" in labels
    assert "field-crop:numbers:p2:id11" in labels
    assert hint is not None
    assert "YOLO detections" in hint
    assert "OCR template" in hint


def test_merge_rule_a_template_only_when_yolo_empty():
    hint, crops = merge_yolo_and_template_guidance(
        YoloLlmGuidance(),
        "- numbers priority=1: x=1",
        [("field-crop:numbers:p1:id1", b"template-numbers")],
    )
    assert crops == [("field-crop:numbers:p1:id1", b"template-numbers")]
    assert hint is not None
    assert "OCR template field layouts" in hint


def test_limit_vision_extra_images_skips_ticket_prefers_numbers():
    crops = [
        (f"{YOLO_TICKET_CROP_PREFIX}0", b"ticket"),
        (f"{YOLO_FIELD_CROP_PREFIX}drawDate", b"date"),
        (f"{YOLO_FIELD_CROP_PREFIX}numbers", b"numbers"),
        (f"{YOLO_FIELD_CROP_PREFIX}serialNumber", b"serial"),
        (f"{YOLO_FIELD_CROP_PREFIX}stationName", b"station"),
    ]
    limited = limit_vision_extra_images(crops)
    assert len(limited) == GROQ_MAX_EXTRA_IMAGES
    labels = [label for label, _ in limited]
    assert f"{YOLO_TICKET_CROP_PREFIX}0" not in labels
    assert f"{YOLO_FIELD_CROP_PREFIX}numbers" in labels
    assert f"{YOLO_FIELD_CROP_PREFIX}serialNumber" in labels


def test_limit_vision_extra_images_fields_only_prioritizes_numbers():
    crops = [
        (f"{YOLO_FIELD_CROP_PREFIX}drawDate", b"date"),
        (f"{YOLO_FIELD_CROP_PREFIX}batchCode", b"batch"),
        (f"{YOLO_FIELD_CROP_PREFIX}numbers", b"numbers"),
        (f"{YOLO_FIELD_CROP_PREFIX}serialNumber", b"serial"),
    ]
    limited = limit_vision_extra_images(crops, max_extra=2)
    assert [label for label, _ in limited] == [
        f"{YOLO_FIELD_CROP_PREFIX}numbers",
        f"{YOLO_FIELD_CROP_PREFIX}serialNumber",
    ]
