"""Unit tests for GroqVisionClient (no live API calls)."""

from __future__ import annotations

import json

import httpx
import pytest

from infra.groq_client import GroqVisionClient
from infra.vision_extraction import VisionApiError, VisionConfigurationError


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None, text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text or json.dumps(self._payload)

    def json(self):
        return self._payload


def test_groq_client_requires_api_key(monkeypatch):
    monkeypatch.setattr("infra.groq_client.settings.GROQ_API_KEY", "")
    monkeypatch.setattr(
        "infra.groq_client.settings.GROQ_API_BASE_URL",
        "https://api.groq.com/openai/v1",
    )
    client = GroqVisionClient()
    with pytest.raises(VisionConfigurationError):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")


def test_groq_client_parses_chat_completions(monkeypatch):
    extraction = {
        "tickets": [
            {
                "stationName": "Bạc Liêu",
                "serialNumber": "AB12",
                "numbers": "123456",
                "drawDate": "2026-08-20",
                "fieldConfidences": {
                    "stationName": 0.9,
                    "serialNumber": 0.9,
                    "numbers": 0.9,
                    "drawDate": 0.9,
                },
            }
        ],
        "warnings": [],
    }

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        assert url.endswith("/chat/completions")
        assert headers["Authorization"] == "Bearer test-key"
        assert json["response_format"] == {"type": "json_object"}
        assert json["reasoning_format"] == "hidden"
        assert json["reasoning_effort"] == "none"
        assert json["messages"][0]["content"][1]["type"] == "image_url"
        return _FakeResponse(
            200,
            {
                "choices": [
                    {"message": {"content": json_module.dumps(extraction)}}
                ]
            },
        )

    import json as json_module

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
        model="qwen/qwen3.8-27b",
        timeout_seconds=5,
    )
    result = client.analyze_ticket_image(b"\xff\xd8\xffdummy", "extract ticket")
    assert result.tickets[0].stationName == "Bạc Liêu"
    assert result.tickets[0].numbers == "123456"


def test_groq_fail_fast_skips_retry_wait(monkeypatch):
    monkeypatch.setattr("infra.groq_client.time.sleep", lambda *_a, **_k: (_ for _ in ()).throw(AssertionError("no sleep")))
    from infra import llm_circuit
    from infra.groq_client import GroqVisionClient, fail_fast_rate_limits

    llm_circuit.reset_for_tests()
    calls = {"n": 0}

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        calls["n"] += 1
        return _FakeResponse(
            429,
            text="Rate limit on input tokens per minute (ITPM): Limit 7000. try again in 40s",
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    with fail_fast_rate_limits(True):
        with pytest.raises(VisionApiError, match="rate limit"):
            client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")
    assert calls["n"] == 1
    assert llm_circuit.is_open()
    llm_circuit.reset_for_tests()


def test_groq_client_maps_rate_limit(monkeypatch):
    monkeypatch.setattr("infra.groq_client.time.sleep", lambda *_args, **_kwargs: None)
    from infra import llm_circuit

    llm_circuit.reset_for_tests()

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        return _FakeResponse(429, {"error": {"message": "rate limit"}}, text="rate limit")

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    with pytest.raises(VisionApiError, match="rate limit"):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")
    # Transient ITPM/TPM trips soft circuit (still open, short cooldown).
    assert llm_circuit.is_open()
    llm_circuit.reset_for_tests()


def test_groq_client_reduces_max_tokens_on_otpm(monkeypatch):
    monkeypatch.setattr("infra.groq_client.time.sleep", lambda *_args, **_kwargs: None)
    # Simulate a build that still requested above OTPM, then auto-shrinks.
    monkeypatch.setattr("infra.groq_client._MAX_COMPLETION_TOKENS_COLLAGE", 1024)
    monkeypatch.setattr("infra.groq_client._OTPM_SAFE_CEILING", 2000)
    from infra import llm_circuit
    import json as json_module

    llm_circuit.reset_for_tests()
    seen_tokens: list[int] = []

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        tokens = int(json["max_completion_tokens"])
        seen_tokens.append(tokens)
        if tokens >= 1000:
            return _FakeResponse(
                429,
                text=(
                    "Request too large for model on output tokens per minute (OTPM): "
                    "Limit 1000, Requested 1024. reduce max_tokens"
                ),
            )
        extraction = {
            "tickets": [
                {
                    "stationName": "Cà Mau",
                    "numbers": "123456",
                    "fieldConfidences": {"numbers": 0.9},
                }
            ],
            "warnings": [],
        }
        return _FakeResponse(
            200,
            {"choices": [{"message": {"content": json_module.dumps(extraction)}}]},
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    result = client.analyze_ticket_image(b"\xff\xd8\xff", "COLLAGE MODE extract")
    assert result.tickets[0].numbers == "123456"
    assert seen_tokens[0] >= 1000
    assert all(t < 1000 for t in seen_tokens[1:])
    llm_circuit.reset_for_tests()


def test_groq_collage_max_tokens_stays_under_otpm_ceiling(monkeypatch):
    import json as json_module

    captured: dict = {}

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        captured["max_completion_tokens"] = json["max_completion_tokens"]
        extraction = {"tickets": [{"numbers": "111111", "fieldConfidences": {}}], "warnings": []}
        return _FakeResponse(
            200,
            {"choices": [{"message": {"content": json_module.dumps(extraction)}}]},
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    client.analyze_ticket_image(b"\xff\xd8\xff", "COLLAGE MODE extract")
    assert captured["max_completion_tokens"] < 1000


def test_groq_client_fails_fast_on_tpd_quota(monkeypatch):
    monkeypatch.setattr("infra.groq_client.time.sleep", lambda *_args, **_kwargs: None)
    from infra import llm_circuit

    llm_circuit.reset_for_tests()
    calls = {"n": 0}

    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        calls["n"] += 1
        return _FakeResponse(
            429,
            {"error": {"message": "Rate limit reached for model on tokens per day (TPD)"}},
            text="Rate limit reached for model on tokens per day (TPD): Limit 100000",
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    with pytest.raises(VisionApiError, match="quota/token"):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")
    assert calls["n"] == 1
    assert llm_circuit.is_open()
    llm_circuit.reset_for_tests()


def test_groq_client_maps_model_not_found(monkeypatch):
    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        return _FakeResponse(
            404,
            {"error": {"message": "model not found", "code": "model_not_found"}},
            text='{"error":{"code":"model_not_found"}}',
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
        model="meta-llama/llama-4-scout-17b-16e-instruct",
    )
    with pytest.raises(VisionApiError, match="unavailable"):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")
