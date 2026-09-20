from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef

THRESHOLD = 80


def test_exact_name_matches(sample_stations):
    matcher = StationMatcher(sample_stations)

    result = matcher.match("TP. Hồ Chí Minh", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "HCM"
    assert result.score >= 0.95


def test_common_ocr_alias_matches_with_accents_stripped(sample_stations):
    matcher = StationMatcher(sample_stations)

    # OCR frequently drops/garbles Vietnamese diacritics.
    result = matcher.match("Sai Gon", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "HCM"


def test_abbreviation_alias_matches(sample_stations):
    matcher = StationMatcher(sample_stations)

    result = matcher.match("TP.HCM", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "HCM"


def test_unrelated_text_does_not_match(sample_stations):
    matcher = StationMatcher(sample_stations)

    result = matcher.match("hoa don thanh toan dien nuoc", THRESHOLD)

    assert result.station is None


def test_kien_giang_not_confused_with_an_giang():
    stations = [
        StationRef(id=10, name="An Giang", code="AGI", aliases=("an giang",)),
        StationRef(id=11, name="Kiên Giang", code="KGI", aliases=("kien giang",)),
        StationRef(id=12, name="Hậu Giang", code="HGI", aliases=("hau giang",)),
        StationRef(id=13, name="Tiền Giang", code="TGI", aliases=("tien giang",)),
    ]
    matcher = StationMatcher(stations)

    result = matcher.match("KIEN GIANG", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "KGI"


def test_an_giang_still_matches():
    stations = [
        StationRef(id=10, name="An Giang", code="AGI", aliases=("an giang",)),
        StationRef(id=11, name="Kiên Giang", code="KGI", aliases=("kien giang",)),
    ]
    matcher = StationMatcher(stations)

    result = matcher.match("AN GIANG", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "AGI"
