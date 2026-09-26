import re
from dataclasses import dataclass, field, replace
from datetime import date

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.layouts.generic_layout import HEADER_HEIGHT_RATIO
from domain.ocr.base import OcrTextResult
from domain.stations.matcher import StationMatcher
from dto.response.scan_response import ExtractedTicketFields

# Real Vietnamese lottery serials: digits with exactly one letter at the
# start OR end only (A123456 / 123456B). Mid-string letters belong to batchCode.
_SERIAL_PATTERN = re.compile(r"^(?:[A-Za-z]\d{4,19}|\d{4,19}[A-Za-z])$")
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
# Separators dropped entirely ("23082026"). Only trusted inside a region the
# template says is the draw date, and to keep dates out of number candidates.
_DATE_COMPACT_PATTERN = re.compile(r"(?<!\d)(\d{2})(\d{2})(\d{4})(?!\d)")

# Ticket price/denomination, printed with thousands-separator dots (e.g.
# "10.000đ", "20.000") -- the currency letter, if any, is often glued to
# the digits with no space ("10.000d"), and _tokenize keeps letters/dots
# attached to the same token, so it has to be optional here rather than
# stripped beforehand. Grouped-by-dots also makes the digit part of this
# pattern naturally disjoint from _DIGITS_ONLY_PATTERN (numbers) and
# _SERIAL_PATTERN (requires a letter) -- no collision risk with those fields.
_DENOMINATION_PATTERN = re.compile(r"^(\d{1,3}(?:\.\d{3})+)(?:đ|d|vnd)?$", re.IGNORECASE)
# Price field crops often drop the thousand-separator dots ("10000d").
# Currency suffix required for plain digits — otherwise lottery numbers like
# "84835" / "188435" get misread as mệnh giá.
_PLAIN_DENOMINATION_PATTERN = re.compile(r"^(\d{4,6})(?:đ|d|vnd)$", re.IGNORECASE)
# Common face values when OCR drops both dots and currency letter.
_COMMON_FACE_VALUES = frozenset({1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000})
# Real ticket prices are a few thousand-to-tens-of-thousands VND; anything
# above this is almost certainly the jackpot/prize amount printed elsewhere
# on the ticket (e.g. "2.000.000.000"), not the ticket's own price.
_MAX_PLAUSIBLE_DENOMINATION = 100_000
_MIN_PLAIN_DENOMINATION = 1_000
# Date-like / pure-digit OCR must not overwrite stationName from field crops.
_STATION_JUNK_DATE = re.compile(
    r"^\d{1,2}[/\-. ]\d{1,2}([/\-. ]\d{2,4})?$|^\d{4}-\d{1,2}-\d{1,2}$"
)
_BATCH_CODE_CANDIDATE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\-]{2,24}$")
# Preferred ký hiệu shapes seen on real tickets (05K22, L040, 5D2, 26-T05K4).
_BATCH_PREFERRED = re.compile(
    r"^(?:"
    r"[A-Z]\s?\d{2,4}"  # L040, C 034
    r"|\d{1,2}[A-Z]\d{1,4}"  # 5D2, 05K22
    r"|\d{1,2}-[A-Z]\d{1,3}[A-Z]?\d*"  # 26-T05K4
    r")$"
)
# Prize / slogan OCR often becomes fake batch codes (2TY from "2 tỷ").
_BATCH_JUNK = frozenset(
    {
        "ty",
        "tydong",
        "dong",
        "giai",
        "dacbiet",
        "db",
        "vnd",
        "00",
        "0",
        "2ty",
        "2tydong",
        "ionn",
        "i0nn",
        "lonn",
        "10nn",
    }
)
# Join split serial letter: "188435 S" / "S 188435" → 188435S / S188435.
_SERIAL_JOIN_PATTERN = re.compile(
    r"(?i)\b([A-Z])\s*(\d{5,8})\b|\b(\d{5,8})\s*([A-Z])\b"
)

# Splits a line into tokens, keeping '.', '/', '-' inside a token so dates
# like "05/08/2026" and serials like "A-01234" survive as one piece.
_TOKEN_SPLIT_PATTERN = re.compile(r"[^\w./\-]+", re.UNICODE)

# Lottery number sits in the lower/mid body; a small 6-digit reprint in the
# header is usually the serial (or a tiny duplicate), not the face number.
_BODY_NUMBER_MIN_Y = 0.42
_HEADER_SERIAL_MAX_Y = 0.40
_DIGIT_SERIAL_PATTERN = re.compile(r"^\d{5,8}$")
# Fallback plausible lengths for the lottery "numbers" field when the
# caller doesn't tell us the station's exact expected length. Prefer 6
# (most VN tickets); keep 5 as secondary. Do NOT accept bare 4-digit years.
_FALLBACK_NUMBER_LENGTHS = (6, 5)


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_SPLIT_PATTERN.split(text) if t]


def _is_plausible_batch_token(token: str) -> bool:
    cleaned = re.sub(r"\s+", "", (token or "").strip().upper())
    if not cleaned or len(cleaned) < 2 or len(cleaned) > 12:
        return False
    folded = cleaned.lower().replace("-", "")
    if folded in _BATCH_JUNK or folded.endswith("ty"):
        return False
    if _SERIAL_PATTERN.match(cleaned):
        return False
    if not _BATCH_CODE_CANDIDATE.match(cleaned):
        return False
    # Prefer structured issuer codes; reject OCR mush like I0NN.
    if _BATCH_PREFERRED.match(cleaned):
        return True
    letters = sum(ch.isalpha() for ch in cleaned)
    digits = sum(ch.isdigit() for ch in cleaned)
    ambiguous = sum(ch in "IOMN" for ch in cleaned)
    if ambiguous >= 2 and letters >= 3:
        return False
    return letters <= 3 and digits <= 5 and 3 <= len(cleaned) <= 8


def _serial_joins_from_text(text: str) -> list[str]:
    """Recover serials when OCR splits the trailing/leading letter."""
    found: list[str] = []
    for match in _SERIAL_JOIN_PATTERN.finditer(text or ""):
        left, digits_a, digits_b, right = match.groups()
        if left and digits_a:
            found.append(f"{left.upper()}{digits_a}")
        elif digits_b and right:
            found.append(f"{digits_b}{right.upper()}")
    return found


def _compact_date(raw_line: str) -> str | None:
    for match in _DATE_COMPACT_PATTERN.finditer(raw_line or ""):
        day_s, month_s, year_s = match.groups()
        year = int(year_s)
        if not _is_plausible_draw_year(year):
            continue
        try:
            return date(year, int(month_s), int(day_s)).isoformat()
        except ValueError:
            continue
    return None


def _without_dates(text: str) -> str:
    """Blank out date substrings so their digits never form a lottery number."""

    def _blank_if_date(match: re.Match) -> str:
        return " " if _to_iso_date(match.group(0)) or _compact_date(match.group(0)) else match.group(0)

    text = _DATE_ISO_PATTERN.sub(_blank_if_date, text)
    text = _DATE_SLASH_PATTERN.sub(_blank_if_date, text)
    return _DATE_COMPACT_PATTERN.sub(_blank_if_date, text)


def _to_iso_date(raw_line: str) -> str | None:
    iso_match = _DATE_ISO_PATTERN.search(raw_line)
    if iso_match:
        year, month, day = (int(g) for g in iso_match.groups())
        if not _is_plausible_draw_year(year):
            return None
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
        if not _is_plausible_draw_year(year):
            return None
        try:
            return date(year, int(month_s), int(day_s)).isoformat()
        except ValueError:
            return None

    return None


def _is_plausible_draw_year(year: int) -> bool:
    """Reject OCR hallucinations like 2043 from misread glyphs."""
    today = date.today().year
    return 2018 <= year <= today + 2


def _is_plausible_number_token(token: str, expected_length: int | None) -> bool:
    if not _DIGITS_ONLY_PATTERN.match(token):
        return False
    # Calendar years (2025/2026) often get mis-tagged as lottery numbers.
    if len(token) == 4 and token.startswith("20"):
        return False
    if expected_length is not None:
        return len(token) == expected_length
    return len(token) in _FALLBACK_NUMBER_LENGTHS


def _digit_runs_from_text(text: str) -> list[str]:
    """Pull digit runs from mixed OCR (e.g. '7 BẢY 5 NĂM …' → 759481)."""
    if not text:
        return []
    runs = re.findall(r"\d+", text)
    collapsed = re.sub(r"\D", "", text)
    if collapsed and collapsed not in runs:
        runs.append(collapsed)
    return runs


def _number_candidates_from_text(text: str, expected_length: int | None) -> list[str]:
    want = expected_length or 6
    found: list[str] = []
    for run in _digit_runs_from_text(_without_dates(text)):
        if _is_plausible_number_token(run, expected_length):
            found.append(run)
            continue
        if len(run) > want:
            for i in range(0, len(run) - want + 1):
                chunk = run[i : i + want]
                if _is_plausible_number_token(chunk, expected_length or want):
                    found.append(chunk)
    return found


def _denomination_value(token: str) -> int | None:
    match = _DENOMINATION_PATTERN.match(token)
    if match:
        value = int(match.group(1).replace(".", ""))
        if 0 < value <= _MAX_PLAUSIBLE_DENOMINATION:
            return value
        return None
    plain = _PLAIN_DENOMINATION_PATTERN.match(token)
    if plain:
        value = int(plain.group(1))
        if _MIN_PLAIN_DENOMINATION <= value <= _MAX_PLAUSIBLE_DENOMINATION:
            return value
        return None
    # Bare digits only when they match a known face value (e.g. "10000").
    if _DIGITS_ONLY_PATTERN.match(token):
        try:
            value = int(token)
        except ValueError:
            return None
        if value in _COMMON_FACE_VALUES:
            return value
    return None


def _format_denomination(value: int) -> str:
    return f"{value:,}".replace(",", ".") + "đ"


def _join_field_texts(results: list, *, keep: str) -> str:
    """Join OCR fragments left-to-right (x_center), keeping only charset chars."""
    ordered = sorted(results, key=lambda r: (r.x_center, r.y_center))
    chunks: list[str] = []
    for result in ordered:
        cleaned = "".join(ch for ch in result.text if ch in keep or ch.isspace())
        cleaned = re.sub(r"\s+", "", cleaned)
        if cleaned:
            chunks.append(cleaned)
    return "".join(chunks)


def _ocr_digit_confusions(text: str) -> str:
    """Remap lookalike glyphs that EasyOCR often inserts into digit runs.

    Keep letter→digit maps conservative so a leading serial letter (B/S)
    is not destroyed.
    """
    return text.replace("O", "0").replace("o", "0").replace("I", "1").replace("l", "1")


# A region named "field:<name>" is known (by the layout that produced it) to
# contain exactly that one field -- see domain/layouts/yolo_field_layout.py.
# Its text is bound straight to the field instead of being fed through the
# shape/position guessing the whole-ticket path has to use.
FIELD_REGION_PREFIX = "field:"


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
        *,
        template_fields: frozenset[str] = frozenset(),
    ) -> ParsedTicket:
        """``template_fields``: fields a station OCR template has a box for.

        Their value comes only from the ``field:<name>`` region; the
        whole-ticket guess is discarded, since it may come from another spot
        on the ticket (e.g. digits of the draw date read as the number).
        """
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
            if not region.startswith(FIELD_REGION_PREFIX)
            for result in results
        ]

        self._extract_station(all_lines, extracted, confidences, positions)
        self._extract_date(all_lines, extracted, confidences, positions)
        self._extract_numbers_and_serial(all_lines, extracted, confidences, positions, expected_number_length)
        self._extract_denomination(all_lines, extracted, confidences)
        self._extract_batch_code(all_lines, extracted, confidences, positions)

        for field_name in template_fields:
            if field_name == "stationName" or not hasattr(extracted, field_name):
                continue
            setattr(extracted, field_name, None)
            if field_name in confidences:
                confidences[field_name] = 0.0
            positions.pop(field_name, None)

        # Applied last so a field the layout located wins over the same field
        # guessed from the whole ticket -- but only where it actually yields
        # a value, so a missed or unreadable field box costs nothing.
        self._apply_field_regions(
            ocr_results_by_region,
            extracted,
            confidences,
            positions,
            expected_number_length,
            template_fields=template_fields,
        )

        return ParsedTicket(extracted=extracted, field_confidences=confidences, field_positions=positions)

    def _apply_field_regions(
        self,
        ocr_results_by_region: dict[str, list[OcrTextResult]],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        positions: dict[str, tuple[float, float]],
        expected_number_length: int | None,
        *,
        template_fields: frozenset[str] = frozenset(),
    ) -> None:
        """Bind text read from single-field crops directly to their field.

        A crop the model says *is* the serial number needs none of the
        whole-ticket disambiguation: there's no competing prize amount or
        batch code in it to be confused with. Each value is still run
        through the same normaliser the heuristic path uses (date parsing,
        station fuzzy-matching, denomination formatting), so a garbled read
        is rejected rather than trusted just because it was well-located.
        """
        for region, results in ocr_results_by_region.items():
            if not region.startswith(FIELD_REGION_PREFIX) or not results:
                continue
            field_name = region[len(FIELD_REGION_PREFIX):]

            best = max(results, key=lambda r: r.confidence)
            value = self._normalise_field_value(field_name, results, best, expected_number_length)
            if value is None:
                continue

            current = getattr(extracted, field_name, None)
            if field_name in template_fields and field_name != "stationName":
                current = None
            # Prefer a complete 6-digit lottery number over a truncated field read.
            if field_name == "numbers" and current and value:
                want = expected_number_length or 6
                if len(str(current)) == want and len(str(value)) != want:
                    continue
                # Both look complete but disagree — keep whole-ticket OCR.
                # YOLO numbers boxes are often slightly off and OCR then
                # invents a plausible but wrong 6-digit string (676789→626621).
                if (
                    len(str(current)) == want
                    and len(str(value)) == want
                    and str(current) != str(value)
                ):
                    continue
            # Neighbor-ticket bleed in a loose station crop can overwrite a
            # correct whole-ticket match (e.g. Bình Dương → Hồ Chí Minh).
            if field_name == "stationName" and current:
                continue
            # Prefer a lettered serial (188435S) over a digit-only field crop.
            if field_name == "serialNumber" and current and value:
                if _SERIAL_PATTERN.match(str(current)) and not _SERIAL_PATTERN.match(str(value)):
                    continue

            setattr(extracted, field_name, value)
            confidences[field_name] = best.confidence
            # Drop any position recorded by the whole-ticket pass: it refers
            # to a location this value no longer came from, and
            # TicketScanService's ROI refinement would re-crop there and
            # could clobber this reading. Refinement has nothing to add here
            # anyway -- a single-field crop *is* the tight ROI it tries to
            # reconstruct.
            positions.pop(field_name, None)
            if field_name == "stationName":
                match = self._station_matcher.match(best.text, self._station_fuzzy_threshold)
                if match.station is not None:
                    extracted.stationCode = match.station.code
            if field_name == "batchCode":
                confidences["batchCode"] = best.confidence

    def normalise_field(
        self,
        field_name: str,
        results: list[OcrTextResult],
        expected_number_length: int | None = None,
    ) -> str | None:
        """Value a single-field region would yield, or None when unusable."""
        if not results:
            return None
        best = max(results, key=lambda r: r.confidence)
        return self._normalise_field_value(field_name, results, best, expected_number_length)

    def _normalise_field_value(
        self, field_name: str, results, best, expected_number_length: int | None = None
    ) -> str | None:
        """Validate/convert a single-field crop's text, or None to keep the
        whole-ticket result."""
        if field_name == "drawDate":
            ranked = sorted(results, key=lambda r: -r.confidence)
            for result in ranked:
                iso_date = _to_iso_date(result.text)
                if iso_date:
                    return iso_date
            for result in ranked:
                iso_date = _compact_date(re.sub(r"\s+", "", result.text))
                if iso_date:
                    return iso_date
            return None

        if field_name == "stationName":
            # Only accept a matched station. Returning raw OCR (dates, number
            # fragments) used to overwrite a correct whole-ticket station match.
            for result in sorted(results, key=lambda r: -r.confidence):
                text = re.sub(r"\s+", " ", result.text.strip())
                if not text or _STATION_JUNK_DATE.match(text):
                    continue
                if _DIGITS_ONLY_PATTERN.match(re.sub(r"[\s./\-]", "", text)):
                    continue
                match = self._station_matcher.match(text, self._station_fuzzy_threshold)
                if match.station is not None:
                    return match.station.name
            return None

        if field_name == "ticketType":
            for result in sorted(results, key=lambda r: -r.confidence):
                for token in _tokenize(result.text):
                    value = _denomination_value(token)
                    if value is not None:
                        return _format_denomination(value)
            joined = _join_field_texts(results, keep="0123456789.dDđ")
            if joined:
                value = _denomination_value(joined)
                if value is not None:
                    return _format_denomination(value)
            return None

        if field_name == "batchCode":
            for result in sorted(results, key=lambda r: -r.confidence):
                for token in _tokenize(result.text):
                    cleaned = token.strip().upper()
                    if _is_plausible_batch_token(cleaned):
                        return cleaned
                collapsed = re.sub(r"\s+", "", result.text.strip()).upper()
                if _is_plausible_batch_token(collapsed):
                    return collapsed
            return None

        if field_name == "numbers":
            # Digits only -- OCR often reads the widely-kerned decorative
            # copy with spaces between every digit, or splits into fragments.
            # Also recover when digit-words (BẢY/NĂM/…) sit under each glyph.
            results = [replace(r, text=_without_dates(r.text)) for r in results]
            best = max(results, key=lambda r: r.confidence)
            candidates: list[str] = []
            for result in results:
                candidates.extend(
                    _number_candidates_from_text(result.text, expected_number_length)
                )
            collapsed_best = re.sub(r"\s+", "", best.text.strip())
            if collapsed_best:
                candidates.append(collapsed_best)
            joined = _join_field_texts(results, keep="0123456789")
            if joined:
                candidates.append(joined)
            # Prefer exact expected/6-digit candidates first.
            ranked = sorted(
                dict.fromkeys(candidates),
                key=lambda c: (
                    1 if _is_plausible_number_token(c, expected_number_length or 6) else 0,
                    1 if _is_plausible_number_token(c, expected_number_length) else 0,
                    len(c),
                ),
                reverse=True,
            )
            for cand in ranked:
                if _is_plausible_number_token(cand, expected_number_length):
                    return cand
                if expected_number_length is None and _is_plausible_number_token(cand, 6):
                    return cand
            return None

        if field_name == "serialNumber":
            candidates: list[str] = []
            for result in results:
                candidates.extend(_serial_joins_from_text(result.text))
                collapsed = re.sub(r"\s+", "", result.text.strip())
                if collapsed:
                    candidates.append(collapsed)
                    candidates.append(_ocr_digit_confusions(collapsed))
            joined = _join_field_texts(
                results, keep="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
            )
            if joined:
                candidates.append(joined)
                candidates.append(_ocr_digit_confusions(joined))
                candidates.extend(_serial_joins_from_text(joined))
            # Prefer letter+digit serials (188435S) over digit-only reprints.
            ranked = sorted(
                dict.fromkeys(c.upper() if c else c for c in candidates if c),
                key=lambda c: (
                    1 if _SERIAL_PATTERN.match(c) else 0,
                    1 if _DIGIT_SERIAL_PATTERN.match(c) else 0,
                    len(c),
                ),
                reverse=True,
            )
            for cand in ranked:
                if _SERIAL_PATTERN.match(cand):
                    return cand
                if _DIGIT_SERIAL_PATTERN.match(cand):
                    return cand
            return None

        return None

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
            # Neighbor tickets in an oversized crop usually sit on the far
            # right/left — down-weight those OCR lines so Bình Dương is not
            # overwritten by a sliver of "Hồ Chí Minh" from the next ticket.
            if line.x_center >= 0.82 or line.x_center <= 0.05:
                continue
            result = self._station_matcher.match(line.text, self._station_fuzzy_threshold)
            if result.station is None:
                continue
            edge_penalty = 0.0
            if line.x_center > 0.70:
                edge_penalty = 0.35
            elif line.x_center > 0.60:
                edge_penalty = 0.15
            # Prefer header/banner lines (top of ticket) over body slogans.
            header_bonus = 0.12 if line.position < HEADER_HEIGHT_RATIO else 0.0
            # Prefer horizontally centered station banners over side strips.
            center_bonus = 0.08 * (1.0 - min(abs(line.x_center - 0.45), 0.45) / 0.45)
            combined = (
                result.score * line.confidence * (1.0 - edge_penalty)
                + header_bonus
                + center_bonus
            )
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
        # Prefer dates in the lower half (draw-date panel); header often has
        # commemorative dates that are not the draw date.
        ranked = sorted(all_lines, key=lambda line: (-line.position, -line.confidence))
        for line in ranked:
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
                    number_candidates.setdefault(token, []).append(
                        (line.confidence, line.position, line.x_center)
                    )
                elif _SERIAL_PATTERN.match(token):
                    serial_candidates.setdefault(token, []).append(
                        (line.confidence, line.position, line.x_center)
                    )

            for joined in _serial_joins_from_text(line.text):
                if _SERIAL_PATTERN.match(joined):
                    serial_candidates.setdefault(joined, []).append(
                        (line.confidence, line.position, line.x_center)
                    )

            # Digit words under each glyph ("BẢY","NĂM",…) must not block the
            # 6-digit run — strip non-digits and sliding-window if needed.
            for num in _number_candidates_from_text(line.text, expected_number_length):
                number_candidates.setdefault(num, []).append(
                    (line.confidence, line.position, line.x_center)
                )
                # Small header digit runs are often the serial on HCM/BD tickets.
                if (
                    line.position <= _HEADER_SERIAL_MAX_Y
                    and _DIGIT_SERIAL_PATTERN.match(num)
                    and not _SERIAL_PATTERN.match(num)
                ):
                    serial_candidates.setdefault(num, []).append(
                        (line.confidence, line.position, line.x_center)
                    )

        if number_candidates:
            # Prefer body (large face number) over a tiny header reprint that
            # is actually the serial (e.g. 100000 at top vs 676789 below).
            def _number_rank(item: tuple[str, list[tuple[float, float, float]]]) -> tuple:
                _value, occ = item
                body = [o for o in occ if o[1] >= _BODY_NUMBER_MIN_Y]
                use = body if body else occ
                return (
                    len(body),
                    max(p for _, p, _ in use),
                    max(c for c, _, _ in use),
                    len(occ),
                )

            best_value = max(number_candidates.items(), key=_number_rank)[0]
            occurrences = number_candidates[best_value]
            extracted.numbers = best_value
            confidences["numbers"] = max(c for c, _, _ in occurrences)
            _, pos, x_center = max(occurrences, key=lambda o: (o[1], o[0]))
            positions["numbers"] = (pos, x_center)

        if serial_candidates:
            # Drop digit-only duplicates of the face number, but keep letter
            # forms like 188435S built by joining a trailing "S".
            numbers = extracted.numbers or ""
            if numbers:
                serial_candidates.pop(numbers, None)
        if serial_candidates:
            # Letter+digit serials win over digit-only. Digit-only: prefer header.
            def _serial_rank(item: tuple[str, list[tuple[float, float, float]]]) -> tuple:
                value, occ = item
                lettered = bool(_SERIAL_PATTERN.match(value))
                digit_only = bool(_DIGIT_SERIAL_PATTERN.match(value)) and not lettered
                if digit_only:
                    header = [o for o in occ if o[1] <= _HEADER_SERIAL_MAX_Y]
                    use = header if header else occ
                    return (
                        0,  # below lettered
                        1 if header else 0,
                        -min(p for _, p, _ in use),
                        max(c for c, _, _ in use),
                    )
                return (
                    1 if lettered else 0,
                    max(p for _, p, _ in occ),
                    max(c for c, _, _ in occ),
                    0,
                )

            best_value = max(serial_candidates.items(), key=_serial_rank)[0]
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

    def _extract_batch_code(
        self,
        all_lines: list[_Line],
        extracted: ExtractedTicketFields,
        confidences: dict[str, float],
        positions: dict[str, tuple[float, float]],
    ) -> None:
        """Pick issuer ký hiệu/lô (letters+digits, not serial-shaped)."""
        best: tuple[tuple, str, _Line] | None = None
        serial = (extracted.serialNumber or "").strip().upper()
        numbers = (extracted.numbers or "").strip()
        for line in all_lines:
            if line.x_center >= 0.85:
                continue  # neighbor-ticket bleed
            tokens = set(_tokenize(line.text))
            collapsed = re.sub(r"\s+", "", line.text.strip())
            if collapsed:
                tokens.add(collapsed)
            for token in tokens:
                cleaned = re.sub(r"\s+", "", token.strip().upper())
                if not cleaned or cleaned == serial or cleaned == numbers:
                    continue
                if cleaned == numbers + "S" or cleaned.endswith(numbers):
                    continue
                if not _is_plausible_batch_token(cleaned):
                    continue
                preferred = 1 if _BATCH_PREFERRED.match(cleaned) else 0
                # Prefer left side; preferred codes (05K22) often sit bottom-left
                # under the illustration, not mid-logo.
                left_score = 1.0 - min(abs(line.x_center - 0.28), 1.0)
                if preferred:
                    y_score = 1.0 - min(abs(line.position - 0.82), 1.0)
                else:
                    y_score = 1.0 - min(line.position, 1.0)
                score = (
                    preferred,
                    left_score,
                    y_score,
                    line.confidence,
                )
                candidate = (score, cleaned, line)
                if best is None or candidate[0] > best[0]:
                    best = candidate
        if best is None:
            return
        _score, value, line = best
        extracted.batchCode = value
        confidences["batchCode"] = line.confidence
        positions["batchCode"] = (line.position, line.x_center)
