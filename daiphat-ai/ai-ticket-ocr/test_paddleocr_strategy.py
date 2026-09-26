"""Unit tests for PaddleOCR result parsing (no live paddle models)."""

from domain.ocr.paddleocr_strategy import (
    _iter_paddle_lines,
    _is_pdx_reinit_error,
    _pad_for_recognition,
    _paddle_init_candidates,
    _parse_classic_line,
)
import numpy as np


def test_parse_classic_bbox_text_conf_tuple():
    item = [[[0, 0], [10, 0], [10, 5], [0, 5]], ("424944", 0.91)]
    bbox, text, conf = _parse_classic_line(item)
    assert text == "424944"
    assert conf == 0.91
    assert bbox[0] == [0, 0]


def test_parse_classic_rejects_malformed_without_raising():
    # Previously: ``for bbox, (text, confidence) in page`` → tuple index OOR.
    assert _parse_classic_line([((0, 0),)]) is None
    assert _parse_classic_line("not-a-line") is None
    assert _parse_classic_line(None) is None


def test_iter_paddlex_dict_result():
    raw = {
        "rec_texts": ["A123456", "424944"],
        "rec_scores": [0.8, 0.95],
        "dt_polys": [
            [[0, 0], [20, 0], [20, 8], [0, 8]],
            [[0, 10], [40, 10], [40, 20], [0, 20]],
        ],
    }
    lines = list(_iter_paddle_lines(raw))
    assert len(lines) == 2
    assert lines[0][1] == "A123456"
    assert lines[1][1] == "424944"
    assert lines[1][2] == 0.95


def test_iter_nested_classic_pages():
    raw = [
        [
            [[[1, 1], [2, 1], [2, 2], [1, 2]], ("HCM", 0.7)],
            [[[3, 3], [4, 3], [4, 4], [3, 4]], ("08D", 0.6)],
        ]
    ]
    lines = list(_iter_paddle_lines(raw))
    assert [t for _, t, _ in lines] == ["HCM", "08D"]


def test_paddle_init_candidates_lean_v3_first(monkeypatch):
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_ENABLE_MKLDNN", False, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_CPU_THREADS", 4, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_USE_GPU", False, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_OCR_VERSION", "PP-OCRv3", raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_DET_LIMIT_SIDE_LEN", 960, raising=False
    )
    candidates = _paddle_init_candidates("vi")
    assert candidates[0]["use_doc_orientation_classify"] is False
    assert candidates[0]["use_doc_unwarping"] is False
    assert candidates[0]["use_textline_orientation"] is False
    assert candidates[0]["enable_mkldnn"] is False
    assert candidates[0]["cpu_threads"] == 4
    assert candidates[0]["device"] == "cpu"
    assert candidates[0]["ocr_version"] == "PP-OCRv3"
    assert candidates[0]["text_det_limit_side_len"] == 960
    assert "use_gpu" not in candidates[0]
    assert candidates[-1]["enable_mkldnn"] is False


def test_paddle_init_candidates_prefer_mkldnn_when_enabled(monkeypatch):
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_ENABLE_MKLDNN", True, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_CPU_THREADS", 8, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_USE_GPU", False, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_PADDLE_OCR_VERSION", "PP-OCRv5", raising=False
    )
    candidates = _paddle_init_candidates("vi")
    assert candidates[0].get("enable_mkldnn") is True
    assert candidates[0].get("cpu_threads") == 8
    assert candidates[0].get("ocr_version") == "PP-OCRv5"
    assert candidates[-1] == {"lang": "vi", "enable_mkldnn": False}


def test_iter_paddle_none_and_empty_pages():
    assert list(_iter_paddle_lines(None)) == []
    assert list(_iter_paddle_lines([None])) == []
    assert list(_iter_paddle_lines([[]])) == []


def test_iter_textrecognition_single_rec_text():
    raw = [{"rec_text": "188435", "rec_score": 0.97}]
    lines = list(_iter_paddle_lines(raw))
    assert len(lines) == 1
    assert lines[0][1] == "188435"
    assert lines[0][2] == 0.97


def test_parse_recognition_only_tuple():
    bbox, text, conf = _parse_classic_line(("A012345", 0.88))
    assert text == "A012345"
    assert conf == 0.88


def test_pad_for_recognition_adds_white_border():
    img = np.zeros((10, 20, 3), dtype=np.uint8)
    padded = _pad_for_recognition(img, pad=5)
    assert padded.shape == (20, 30, 3)
    assert padded[0, 0, 0] == 255
    assert padded[5, 5, 0] == 0


def test_pdx_reinit_error_detection():
    assert _is_pdx_reinit_error(
        RuntimeError("PDX has already been initialized. Reinitialization is not supported.")
    )
    assert not _is_pdx_reinit_error(RuntimeError("out of memory"))
