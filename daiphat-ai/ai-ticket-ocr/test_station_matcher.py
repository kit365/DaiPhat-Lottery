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


def test_station_codes_and_letter_fragments_are_not_matched():
    # Codes are staff shorthand; as 2-3 letter choices they matched any OCR
    # text containing them ("MTVXO" → Trà Vinh, "2" → "BT2"), and a stray
    # letter matched inside a longer name ("C" → Hồ Chí Minh).
    stations = [
        StationRef(id=1, name="Hồ Chí Minh", code="HCM", aliases=("Hồ Chí Minh",)),
        StationRef(id=12, name="Bình Thuận", code="BT2", aliases=("Bình Thuận",)),
        StationRef(id=15, name="Trà Vinh", code="TV", aliases=("Trà Vinh",)),
    ]
    matcher = StationMatcher(stations)

    for text in ("MTVXO", "2", "C", "TV", "BT2"):
        assert matcher.match(text, THRESHOLD).station is None
    assert matcher.match("TRA VINH", THRESHOLD).station.id == 15


def test_name_inside_banner_read_without_spaces_matches():
    stations = [
        StationRef(id=5, name="Vũng Tàu", code="VT", aliases=("Vũng Tàu",)),
        StationRef(id=12, name="Bình Thuận", code="BT2", aliases=("Bình Thuận",)),
        StationRef(id=21, name="Đà Lạt", code="DL", aliases=("Đà Lạt",)),
    ]
    matcher = StationMatcher(stations)

    assert matcher.match("XOSOKIENTHIETBARIAVUNGTAU", THRESHOLD).station.id == 5
    assert matcher.match("XOSOKIENTHIET BARIAVUNGTAU", THRESHOLD).station.id == 5
    assert matcher.match("dKQxSVüngTau", THRESHOLD).station.id == 5
    assert matcher.match("XOSOKIENTHIET", THRESHOLD).station is None


def test_an_giang_still_matches():
    stations = [
        StationRef(id=10, name="An Giang", code="AGI", aliases=("an giang",)),
        StationRef(id=11, name="Kiên Giang", code="KGI", aliases=("kien giang",)),
    ]
    matcher = StationMatcher(stations)

    result = matcher.match("AN GIANG", THRESHOLD)

    assert result.station is not None
    assert result.station.code == "AGI"
