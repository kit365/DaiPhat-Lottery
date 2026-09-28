from pathlib import Path

from infra import llm_quota


def test_quota_unlimited_never_exhausts(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(llm_quota.settings, "TICKET_VISION_LLM_DAILY_QUOTA", 0)
    llm_quota.set_quota_dir_for_tests(tmp_path)
    try:
        first = llm_quota.try_consume()
        second = llm_quota.try_consume()
        assert not first.exhausted
        assert not second.exhausted
        assert second.used == 2
        assert second.remaining is None
    finally:
        llm_quota.set_quota_dir_for_tests(None)


def test_quota_exhausts_at_limit(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(llm_quota.settings, "TICKET_VISION_LLM_DAILY_QUOTA", 2)
    llm_quota.set_quota_dir_for_tests(tmp_path)
    try:
        assert not llm_quota.try_consume().exhausted
        assert not llm_quota.try_consume().exhausted
        third = llm_quota.try_consume()
        assert third.exhausted
        assert third.used == 2
        assert third.remaining == 0
        snap = llm_quota.snapshot()
        assert snap.exhausted
        assert snap.used == 2
    finally:
        llm_quota.set_quota_dir_for_tests(None)


def test_model_manifest_has_version_keys():
    from infra.model_manifest import load_model_manifest

    manifest = load_model_manifest()
    assert "yoloVersion" in manifest
    assert "fieldOcrVersion" in manifest
    assert "recognitionEngine" in manifest
