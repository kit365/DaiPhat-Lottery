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
        model="qwen/qwen3.6-27b",
        timeout_seconds=5,
    )
    result = client.analyze_ticket_image(b"\xff\xd8\xffdummy", "extract ticket")
    assert result.tickets[0].stationName == "Bạc Liêu"
    assert result.tickets[0].numbers == "123456"


def test_groq_client_maps_rate_limit(monkeypatch):
    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        return _FakeResponse(429, {"error": {"message": "rate limit"}}, text="rate limit")

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GroqVisionClient(
        api_base_url="https://api.groq.com/openai/v1",
        api_key="test-key",
    )
    with pytest.raises(VisionApiError, match="rate limit"):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")


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
