from domain.stations.matcher import StationMatcher

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


def test_empty_text_does_not_match(sample_stations):
    matcher = StationMatcher(sample_stations)

    result = matcher.match("", THRESHOLD)

    assert result.station is None
    assert result.score == 0.0


def test_no_known_stations_never_matches():
    matcher = StationMatcher([])

    result = matcher.match("TP. Hồ Chí Minh", THRESHOLD)

    assert result.station is None
