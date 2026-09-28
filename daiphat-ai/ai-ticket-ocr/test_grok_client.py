import json

import pytest

from infra.vision_extraction import (
    ScanExtractionResult,
    TicketExtraction,
    VisionApiError,
    parse_scan_extraction_json,
)


def test_parse_scan_extraction_json_from_plain_object():
    payload = {
        "tickets": [
            {
                "stationName": "TP. Hồ Chí Minh",
                "serialNumber": "A012345",
                "numbers": "123456",
                "drawDate": "2026-08-05",
                "fieldConfidences": {
                    "stationName": 0.9,
                    "serialNumber": 0.88,
                    "numbers": 0.91,
                    "drawDate": 0.87,
                },
            }
        ],
        "warnings": [],
    }
    result = parse_scan_extraction_json(json.dumps(payload))
    assert isinstance(result, ScanExtractionResult)
    assert result.tickets[0].stationName == "TP. Hồ Chí Minh"


def test_parse_scan_extraction_json_strips_markdown_fence():
    inner = json.dumps(
        {
            "tickets": [TicketExtraction(stationName="Cần Thơ").model_dump()],
            "warnings": ["partial glare"],
        }
    )
    fenced = f"```json\n{inner}\n```"
    result = parse_scan_extraction_json(fenced)
    assert result.tickets[0].stationName == "Cần Thơ"
    assert result.warnings == ["partial glare"]


def test_parse_scan_extraction_json_rejects_invalid_json():
    with pytest.raises(VisionApiError):
        parse_scan_extraction_json("not json")
