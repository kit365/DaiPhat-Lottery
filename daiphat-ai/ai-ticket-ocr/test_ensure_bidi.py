"""Tests for Windows-safe python-bidi bootstrap."""

from domain.ocr.ensure_bidi import ensure_bidi


def test_ensure_bidi_exposes_root_get_display():
    ensure_bidi()
    from bidi import get_display
    from bidi.algorithm import get_display as algo_get_display

    assert get_display("848335G") == "848335G"
    assert algo_get_display("CA MAU") == "CA MAU"


def test_ensure_bidi_idempotent():
    ensure_bidi()
    ensure_bidi()
    from bidi import get_display

    assert callable(get_display)
