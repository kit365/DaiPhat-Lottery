import re
from dataclasses import dataclass, field
from datetime import date

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.ocr.base import OcrTextResult
from domain.stations.matcher import StationMatcher
from dto.response.scan_response import ExtractedTicketFields

# doc section 3, Layer 1 rules:
#   serialNumber -> pattern similar to [A-Za-z]?\d{5,8}
#   numbers      -> numeric only, correct length for the station
#   drawDate     -> valid ISO date
_SERIAL_PATTERN = re.compile(r"^[A-Za-z]?\d{5,8}$")
_DIGITS_ONLY_PATTERN = re.compile(r"^\d+$")
_DATE_ISO_PATTERN = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
_DATE_SLASH_PATTERN = re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b")

# Splits a line into tokens, keeping '.', '/', '-' inside a token so dates
# like "05/08/2026" and serials like "A-01234" survive as one piece.
_TOKEN_SPLIT_PATTERN = re.compile(r"[^\w./\-]+", re.UNICODE)

# Fallback plausible lengths for the lottery "numbers" field when the
# caller doesn't tell us the station's exact expected length (most
# Vietnamese lottery products print either a 6-digit or a 5-digit number).
_FALLBACK_NUMBER_LENGTHS = (4, 5, 6)


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_SPLIT_PATTERN.split(text) if t]


def _to_iso_date(raw_line: str) -> str | None:
    iso_match = _DATE_ISO_PATTERN.search(raw_line)
    if iso_match:
        year, month, day = (int(g) for g in iso_match.groups())
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            return None

    slash_match = _DATE_SLASH_PATTERN.search(raw_line)
    if slash_match:
        day_s, month_s, year_s = slash_match.groups()
        year = int(year_s)
        if year < 100:
            year += 2000
        try:
            return date(year, int(month_s), int(day_s)).isoformat()
        except ValueError:
            return None

    return None


def _is_plausible_number_token(token: str, expected_length: int | None) -> bool:
    if not _DIGITS_ONLY_PATTERN.match(token):
        return False
    if expected_length is not None:
        return len(token) == expected_length
    return len(token) in _FALLBACK_NUMBER_LENGTHS


@dataclass
class ParsedTicket:
    extracted: ExtractedTicketFields
    field_confidences: dict[str, float] = field(default_factory=dict)


class TicketParser:
    """Turns per-region OCR text into structured ticket fields.

    This is a best-effort, regex/token-driven parser calibrated against the
    *expected* ticket format described in the spec, not against real sample
    photos (the doc's own section 6 calls for 50-100 real images to tune
    this against, which this environment doesn't have). Treat the token
    disambiguation rules below (which digit run is "numbers" vs part of a
    date vs the serial) as a starting point to refine once real OCR output
    is available.
    """

    def __init__(self, station_matcher: StationMatcher, station_fuzzy_threshold: int) -> None:
        self._station_matcher = station_matcher
        self._station_fuzzy_threshold = station_fuzzy_threshold

    def parse(
        self,
        ocr_results_by_region: dict[str, list[OcrTextResult]],
        expected_number_length: int | None = None,
    ) -> ParsedTicket:
        extracted = ExtractedTicketFields()
        confidences: dict[str, float] = {name: 0.0 for name in REQUIRED_FIELDS}

        all_lines = [
            (region, result.text, result.confidence)
            for region, results in ocr_results_by_region.items()
            for result in results
        ]

        self._extract_station(all_lines, extracted, confidences)
        self._extract_date_serial_numbers(all_lines, extracted, confidences, expected_number_length)

        return ParsedTicket(extracted=extracted, field_confidences=confidences)

    def _extract_station(
        self,
        all_lines: list[tuple[str, str, float]],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
    ) -> None:
        # Station name conventionally prints in the header band; prefer
        # those lines, but fall back to scanning everything if the generic
        # header/body split missed it.
        header_lines = [(text, conf) for region, text, conf in all_lines if region == "header"]
        candidate_lines = header_lines or [(text, conf) for _region, text, conf in all_lines]

        best_confidence = 0.0
        best_station = None
        for text, ocr_confidence in candidate_lines:
            result = self._station_matcher.match(text, self._station_fuzzy_threshold)
            if result.station is None:
                continue
            # Combine "how well the text matched a known station" with "how
            # sure the OCR engine was about that text" into one confidence.
            combined = result.score * ocr_confidence
            if combined > best_confidence:
                best_confidence = combined
                best_station = result.station

        if best_station is not None:
            extracted.stationName = best_station.name
            extracted.stationCode = best_station.code
            confidences["stationName"] = best_confidence

    def _extract_date_serial_numbers(
        self,
        all_lines: list[tuple[str, str, float]],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        expected_number_length: int | None,
    ) -> None:
        date_claimed = False
        numbers_claimed = False
        serial_claimed = False

        for _region, text, ocr_confidence in all_lines:
            if not date_claimed:
                iso_date = _to_iso_date(text)
                if iso_date:
                    extracted.drawDate = iso_date
                    confidences["drawDate"] = ocr_confidence
                    date_claimed = True

            for token in _tokenize(text):
                if not numbers_claimed and _is_plausible_number_token(token, expected_number_length):
                    extracted.numbers = token
                    confidences["numbers"] = ocr_confidence
                    numbers_claimed = True
                    continue

                if not serial_claimed and _SERIAL_PATTERN.match(token) and token != extracted.numbers:
                    extracted.serialNumber = token
                    confidences["serialNumber"] = ocr_confidence
                    serial_claimed = True
