import re
from dataclasses import dataclass, field
from datetime import date

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.layouts.generic_layout import HEADER_HEIGHT_RATIO
from domain.ocr.base import OcrTextResult
from domain.stations.matcher import StationMatcher
from dto.response.scan_response import ExtractedTicketFields

# Real Vietnamese lottery serials mix letters and digits throughout (e.g.
# "32TV17", "T05K4"), not just an optional single leading letter -- must
# contain at least one of each, alphanumeric only, a plausible serial length.
_SERIAL_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,10}$")
_DIGITS_ONLY_PATTERN = re.compile(r"^\d+$")
_DATE_ISO_PATTERN = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
_DATE_SLASH_PATTERN = re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b")
# OCR occasionally drops a date's separator glyph (a thin "-" or "/" is easy
# to miss against a busy/colored ticket background) and reads it back as
# whitespace instead, e.g. "28 04 2023". Tried only after the separator
# patterns fail; date.fromisoformat/date(...) below still rejects anything
# that isn't a real calendar date, so a stray triplet of numbers elsewhere
# on the ticket (prices, SMS shortcodes) is harmless unless it happens to
# also be a valid day/month/year.
_DATE_SPACE_PATTERN = re.compile(r"\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b")

# Ticket price/denomination, printed with thousands-separator dots (e.g.
# "10.000đ", "20.000") -- the currency letter, if any, is often glued to
# the digits with no space ("10.000d"), and _tokenize keeps letters/dots
# attached to the same token, so it has to be optional here rather than
# stripped beforehand. Grouped-by-dots also makes the digit part of this
# pattern naturally disjoint from _DIGITS_ONLY_PATTERN (numbers) and
# _SERIAL_PATTERN (requires a letter) -- no collision risk with those fields.
_DENOMINATION_PATTERN = re.compile(r"^(\d{1,3}(?:\.\d{3})+)(?:đ|d|vnd)?$", re.IGNORECASE)
# Real ticket prices are a few thousand-to-tens-of-thousands VND; anything
# above this is almost certainly the jackpot/prize amount printed elsewhere
# on the ticket (e.g. "2.000.000.000"), not the ticket's own price.
_MAX_PLAUSIBLE_DENOMINATION = 100_000

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

    day_month_year_match = _DATE_SLASH_PATTERN.search(raw_line) or _DATE_SPACE_PATTERN.search(raw_line)
    if day_month_year_match:
        day_s, month_s, year_s = day_month_year_match.groups()
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


def _denomination_value(token: str) -> int | None:
    match = _DENOMINATION_PATTERN.match(token)
    if not match:
        return None
    value = int(match.group(1).replace(".", ""))
    if value <= 0 or value > _MAX_PLAUSIBLE_DENOMINATION:
        return None
    return value


def _format_denomination(value: int) -> str:
    return f"{value:,}".replace(",", ".") + "đ"


def _global_position(region: str, y_center: float) -> float:
    """Map a text line's position (local to its own region crop) onto a
    single 0..1 coordinate spanning the whole ticket, so lines from
    differently-cropped regions ("header" vs "body" vs a single "whole"
    fallback crop, see TicketScanService) can be compared/ordered together.
    Mirrors GenericLayoutStrategy's header/body split ratio.
    """
    y_center = min(max(y_center, 0.0), 1.0)
    if region == "header":
        return y_center * HEADER_HEIGHT_RATIO
    if region == "body":
        return HEADER_HEIGHT_RATIO + y_center * (1 - HEADER_HEIGHT_RATIO)
    return y_center


@dataclass
class ParsedTicket:
    extracted: ExtractedTicketFields
    field_confidences: dict[str, float] = field(default_factory=dict)
    # name -> (position, x_center) of the OCR line each field's value was
    # read from, both 0..1 ticket-relative. Lets TicketScanService re-crop a
    # small, targeted region around a low-confidence field and try OCR again
    # on just that (see TicketScanService._refine_low_confidence_fields).
    # Only populated for fields that were actually found.
    field_positions: dict[str, tuple[float, float]] = field(default_factory=dict)


@dataclass
class _Line:
    text: str
    confidence: float
    position: float  # 0..1, ticket-relative (see _global_position)
    x_center: float = 0.5  # 0..1, ticket-relative (no region transform needed -- see parse())


class TicketParser:
    """Turns per-region OCR text into structured ticket fields.

    Best-effort, regex/token-driven parser calibrated against real ticket
    photos collected during manual testing (not a training set -- the doc's
    section 6 still calls for 50-100 real images to properly tune this).
    Real tickets print several other digit/alnum groups besides the four
    fields this cares about -- prize amounts, SMS shortcodes, a "kỳ vé"
    batch code near the header distinct from the actual serial -- so token
    shape alone is ambiguous. Where more than one candidate matches a
    field's shape, this prefers (in order): how many times the same value
    was read (real tickets print numbers/serial more than once), OCR
    confidence, and vertical position on the ticket (serial/date conventionally
    sit low near the QR code; a header-area alnum code is more likely a
    batch/kỳ-vé code than the true serial).
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
        positions: dict[str, tuple[float, float]] = {}

        # x_center needs no region-dependent transform the way y_center does
        # (_global_position undoes the header/body vertical split): the
        # layout only ever slices the crop into horizontal bands, never
        # columns, so a region-local x_center is already the whole-crop
        # x_center.
        all_lines = [
            _Line(
                text=result.text,
                confidence=result.confidence,
                position=_global_position(region, result.y_center),
                x_center=result.x_center,
            )
            for region, results in ocr_results_by_region.items()
            for result in results
        ]

        self._extract_station(all_lines, extracted, confidences, positions)
        self._extract_date(all_lines, extracted, confidences, positions)
        self._extract_numbers_and_serial(all_lines, extracted, confidences, positions, expected_number_length)
        self._extract_denomination(all_lines, extracted, confidences)

        return ParsedTicket(extracted=extracted, field_confidences=confidences, field_positions=positions)

    def _extract_station(
        self,
        all_lines: list[_Line],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        positions: dict[str, tuple[float, float]],
    ) -> None:
        # Station name conventionally prints in the header band; prefer
        # lines positioned there. Real tickets' header band is often a
        # stylized banner (curved/gradient text, logos) that OCR reads
        # poorly or reads as something that doesn't fuzzy-match any known
        # station, while the actual station name prints again lower down in
        # a plain typeface (e.g. bold red "TRÀ VINH" beside the numbers) --
        # so a header pass that comes up empty must retry against every
        # line, not just when the header band produced *no* OCR text at all.
        header_lines = [line for line in all_lines if line.position < HEADER_HEIGHT_RATIO]

        best_confidence, best_station, best_line = self._best_station_match(header_lines)
        if best_station is None:
            best_confidence, best_station, best_line = self._best_station_match(all_lines)

        if best_station is not None:
            extracted.stationName = best_station.name
            extracted.stationCode = best_station.code
            confidences["stationName"] = best_confidence
            if best_line is not None:
                positions["stationName"] = (best_line.position, best_line.x_center)

    def _best_station_match(self, lines: list[_Line]):
        best_confidence = 0.0
        best_station = None
        best_line = None
        for line in lines:
            result = self._station_matcher.match(line.text, self._station_fuzzy_threshold)
            if result.station is None:
                continue
            # Combine "how well the text matched a known station" with "how
            # sure the OCR engine was about that text" into one confidence.
            combined = result.score * line.confidence
            if combined > best_confidence:
                best_confidence = combined
                best_station = result.station
                best_line = line
        return best_confidence, best_station, best_line

    def _extract_date(
        self,
        all_lines: list[_Line],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        positions: dict[str, tuple[float, float]],
    ) -> None:
        for line in all_lines:
            iso_date = _to_iso_date(line.text)
            if iso_date:
                extracted.drawDate = iso_date
                confidences["drawDate"] = line.confidence
                positions["drawDate"] = (line.position, line.x_center)
                return

    def _extract_numbers_and_serial(
        self,
        all_lines: list[_Line],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        positions: dict[str, tuple[float, float]],
        expected_number_length: int | None,
    ) -> None:
        # value -> every (confidence, position, x_center) occurrence seen for it.
        number_candidates: dict[str, list[tuple[float, float, float]]] = {}
        serial_candidates: dict[str, list[tuple[float, float, float]]] = {}

        for line in all_lines:
            tokens = set(_tokenize(line.text))

            # The lottery number is often printed a second time in a large,
            # widely-kerned decorative typeface; OCR can then read each
            # digit's whitespace gap as a token break ("2 9 8 4 0 7")
            # instead of one contiguous run. Also try the whole line with
            # internal whitespace collapsed as one extra candidate token.
            collapsed = re.sub(r"\s+", "", line.text.strip())
            if collapsed:
                tokens.add(collapsed)

            for token in tokens:
                if _is_plausible_number_token(token, expected_number_length):
                    number_candidates.setdefault(token, []).append((line.confidence, line.position, line.x_center))
                elif _SERIAL_PATTERN.match(token):
                    serial_candidates.setdefault(token, []).append((line.confidence, line.position, line.x_center))

        if number_candidates:
            # Real tickets print the number more than once (a small copy
            # near the header, a large copy across the body) -- a value
            # read repeatedly is a much stronger signal than a single,
            # possibly-misread, one-off token. Ties broken by confidence.
            best_value = max(
                number_candidates.items(),
                key=lambda item: (len(item[1]), max(c for c, _, _ in item[1])),
            )[0]
            occurrences = number_candidates[best_value]
            extracted.numbers = best_value
            confidences["numbers"] = max(c for c, _, _ in occurrences)
            _, pos, x_center = max(occurrences, key=lambda o: o[0])
            positions["numbers"] = (pos, x_center)

        if serial_candidates:
            serial_candidates.pop(extracted.numbers, None)
        if serial_candidates:
            # The true serial conventionally sits low on the ticket, next
            # to the QR code / draw date; a header-area alnum code is more
            # likely a "kỳ vé" batch code. Prefer the lowest (largest
            # position) occurrence seen for each candidate, then confidence.
            best_value = max(
                serial_candidates.items(),
                key=lambda item: (max(p for _, p, _ in item[1]), max(c for c, _, _ in item[1])),
            )[0]
            occurrences = serial_candidates[best_value]
            extracted.serialNumber = best_value
            confidences["serialNumber"] = max(c for c, _, _ in occurrences)
            _, pos, x_center = max(occurrences, key=lambda o: (o[1], o[0]))
            positions["serialNumber"] = (pos, x_center)

    def _extract_denomination(
        self,
        all_lines: list[_Line],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
    ) -> None:
        best_confidence = -1.0
        best_value: int | None = None
        for line in all_lines:
            for token in _tokenize(line.text):
                value = _denomination_value(token)
                if value is not None and line.confidence > best_confidence:
                    best_confidence = line.confidence
                    best_value = value

        if best_value is not None:
            extracted.ticketType = _format_denomination(best_value)
            confidences["ticketType"] = best_confidence
