from dataclasses import dataclass

from rapidfuzz import fuzz, process

from domain.stations.models import StationRef
from libs.text_utils import normalize_text, remove_accents


def _fold(text: str) -> str:
    """Lowercase, collapse whitespace, and strip Vietnamese accents so OCR
    misreads of diacritics ("Tp.HCM" vs "TP.HCM" vs OCR noise) don't block a
    match."""
    return remove_accents(normalize_text(text))


@dataclass
class StationMatchResult:
    station: StationRef | None
    score: float  # 0..1
    matched_alias: str | None


class StationMatcher:
    """Fuzzy-matches OCR'd station text against known station names/aliases.

    Uses token_sort_ratio (not WRatio) so shared suffixes like "Giang"
    (An Giang / Kiên Giang / Hậu Giang / Tiền Giang) do not steal the match.
    """

    # Tokens that appear on many lottery tickets and should not decide a match.
    _GENERIC_TOKENS = frozenset({"giang", "tinh", "tp", "xo", "so", "thiet", "dai", "xskt"})

    def __init__(self, stations: list[StationRef]) -> None:
        self._choices: list[tuple[str, StationRef, str]] = []
        for station in stations:
            candidate_texts = [station.name, *station.aliases]
            if station.code:
                candidate_texts.append(station.code)
            for raw in candidate_texts:
                folded = _fold(raw)
                if folded:
                    self._choices.append((folded, station, raw))

    def match(self, raw_text: str, threshold: int) -> StationMatchResult:
        """threshold is a rapidfuzz score in 0-100 (see
        TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD)."""
        if not raw_text or not self._choices:
            return StationMatchResult(station=None, score=0.0, matched_alias=None)

        folded_query = _fold(raw_text)
        if not folded_query:
            return StationMatchResult(station=None, score=0.0, matched_alias=None)

        candidates = [choice[0] for choice in self._choices]
        best = process.extractOne(
            folded_query,
            candidates,
            scorer=fuzz.token_sort_ratio,
        )
        if best is None:
            return StationMatchResult(station=None, score=0.0, matched_alias=None)

        matched_text, score, index = best
        if score < threshold:
            return StationMatchResult(station=None, score=score / 100.0, matched_alias=None)

        near = process.extract(
            folded_query,
            candidates,
            scorer=fuzz.token_sort_ratio,
            limit=3,
        )
        if near and len(near) >= 2 and (near[0][1] - near[1][1]) < 8:
            winner_tokens = set(matched_text.split())
            query_tokens = set(folded_query.split())
            distinctive = (winner_tokens & query_tokens) - self._GENERIC_TOKENS
            if not distinctive and len(query_tokens) > 1:
                best_ratio = process.extractOne(
                    folded_query,
                    candidates,
                    scorer=fuzz.ratio,
                )
                if best_ratio is None or best_ratio[1] < threshold:
                    return StationMatchResult(
                        station=None, score=score / 100.0, matched_alias=None
                    )
                matched_text, score, index = best_ratio

        _folded, station, original_alias = self._choices[index]
        return StationMatchResult(station=station, score=score / 100.0, matched_alias=original_alias)
