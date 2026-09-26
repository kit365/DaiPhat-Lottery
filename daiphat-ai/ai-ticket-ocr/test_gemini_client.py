"""Unit tests for GeminiVisionClient response parsing (no live API calls)."""

from __future__ import annotations

import json

import httpx
import pytest

from infra.gemini_client import GeminiVisionClient
from infra.vision_extraction import VisionApiError, VisionConfigurationError


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None, text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text or json.dumps(self._payload)

    def json(self):
        return self._payload


def test_gemini_client_requires_api_key(monkeypatch):
    monkeypatch.setattr("infra.gemini_client.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr(
        "infra.gemini_client.settings.GEMINI_API_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta",
    )
    client = GeminiVisionClient()
    with pytest.raises(VisionConfigurationError):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")


def test_gemini_client_parses_generate_content(monkeypatch):
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
        assert "generateContent" in url
        assert headers["x-goog-api-key"] == "test-key"
        assert json["generationConfig"]["responseMimeType"] == "application/json"
        return _FakeResponse(
            200,
            {
                "candidates": [
                    {"content": {"parts": [{"text": json_module.dumps(extraction)}]}}
                ]
            },
        )

    import json as json_module

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GeminiVisionClient(
        api_base_url="https://generativelanguage.googleapis.com/v1beta",
        api_key="test-key",
        model="gemini-2.0-flash",
        timeout_seconds=5,
    )
    result = client.analyze_ticket_image(b"\xff\xd8\xffdummy", "extract ticket")
    assert result.tickets[0].stationName == "Bạc Liêu"
    assert result.tickets[0].numbers == "123456"


def test_gemini_client_maps_http_error(monkeypatch):
    def fake_post(self, url, headers=None, json=None):  # noqa: A002
        return _FakeResponse(429, {"error": {"message": "quota"}}, text="quota")

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    client = GeminiVisionClient(
        api_base_url="https://generativelanguage.googleapis.com/v1beta",
        api_key="test-key",
    )
    with pytest.raises(VisionApiError, match="HTTP 429"):
        client.analyze_ticket_image(b"\xff\xd8\xff", "prompt")
