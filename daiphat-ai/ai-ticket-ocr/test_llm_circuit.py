from infra import llm_circuit


def test_looks_like_quota_exhaustion_detects_tpd():
    assert llm_circuit.looks_like_quota_exhaustion(
        "Rate limit reached for model on tokens per day (TPD): Limit 100000"
    )
    assert llm_circuit.looks_like_quota_exhaustion("insufficient_quota")
    assert not llm_circuit.looks_like_quota_exhaustion("Rate limit reached on requests per minute (RPM)")


def test_circuit_trips_and_opens(monkeypatch):
    llm_circuit.reset_for_tests()
    monkeypatch.setattr(llm_circuit.settings, "TICKET_VISION_LLM_CIRCUIT_COOLDOWN_SECONDS", 60)
    assert not llm_circuit.is_open()
    llm_circuit.trip("test reason")
    snap = llm_circuit.snapshot()
    assert snap.open
    assert snap.remainingSeconds > 0
    assert "test" in snap.reason
    llm_circuit.reset_for_tests()
    assert not llm_circuit.is_open()
