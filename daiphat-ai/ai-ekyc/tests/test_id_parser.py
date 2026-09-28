from app.utils.id_parser import (
    FIELD_KEYS,
    OcrBox,
    detect_card_layout,
    expected_field_side,
    merge_id_card_fields,
    parse_id_fields,
)

FRONT_2021_LINES = [
    ("CĂN CƯỚC CÔNG DÂN", 0.99),
    ("Số / No.: 079203001234", 0.98),
    ("Họ và tên / Full name:", 0.99),
    ("NGUYỄN VĂN AN", 0.97),
    ("Ngày sinh / Date of birth: 01/02/2003", 0.95),
    ("Giới tính / Sex: Nam", 0.95),
    ("Quốc tịch / Nationality: Việt Nam", 0.95),
    ("Có giá trị đến: 1/2/2028", 0.9),
]


def _text(lines):
    return "\n".join(t for t, _ in lines)


def test_parse_front_2021_reads_labelled_and_next_line_values():
    fields = parse_id_fields(_text(FRONT_2021_LINES), FRONT_2021_LINES)

    assert fields["personal_identification_number"] == "079203001234"
    assert fields["full_name"] == "NGUYỄN VĂN AN"
    assert fields["date_of_birth"] == "01/02/2003"
    assert fields["gender"] == "Nam"
    assert fields["nationality"] == "Việt Nam"
    assert fields["expiry_date"] == "01/02/2028"
    assert fields["id_number"] == fields["personal_identification_number"]
    assert fields["name"] == fields["full_name"]
    assert fields["dob"] == fields["date_of_birth"]


def test_parse_tolerates_glued_labels_and_ocr_typos():
    lines = [("Giói tinh/SexNamQuoc tich/NationalityViệt Nam", 0.8)]

    fields = parse_id_fields(_text(lines), lines)

    assert fields["gender"] == "Nam"
    assert fields["nationality"] == "Việt Nam"


def test_parse_never_invents_missing_values():
    fields = parse_id_fields("", [])

    assert all(fields[key] is None for key in FIELD_KEYS)


def test_parse_falls_back_to_mrz_name_and_ignores_mrz_digits_for_id():
    boxes = [
        OcrBox(text="IDVNM2030012345079203001234<<1"),
        OcrBox(text="NGUYEN<<VAN<AN<<<<<<<<<<<<<<<", y1=10, y2=18),
    ]

    fields = parse_id_fields("", [], boxes=boxes)

    assert fields["full_name"] == "NGUYEN VAN AN"
    assert fields["personal_identification_number"] is None


def test_detect_card_layout():
    assert detect_card_layout("Nơi cư trú / Place of residence") == "cccd_2024"
    assert detect_card_layout("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nCĂN CƯỚC CÔNG DÂN") == "cccd_2016_2021"
    assert detect_card_layout("random text") is None


def test_expected_field_side_depends_on_layout():
    assert expected_field_side("issue_date", None) == "back"
    assert expected_field_side("place_of_residence", "cccd_2024") == "back"
    assert expected_field_side("place_of_residence", "cccd_2016_2021") == "front"
    assert expected_field_side("full_name", "cccd_2024") == "front"


def test_merge_prefers_printed_side_and_reports_retake_side_for_missing():
    front = {"full_name": "NGUYỄN VĂN AN", "place_of_residence": "front guess"}
    back = {"place_of_residence": "12 Lê Lợi, Quận 1", "issue_date": "01/02/2024"}

    merged = merge_id_card_fields(front, back, layout="cccd_2024")

    assert merged["full_name"] == "NGUYỄN VĂN AN"
    assert merged["field_sides"]["full_name"] == "front"
    assert merged["place_of_residence"] == "12 Lê Lợi, Quận 1"
    assert merged["field_sides"]["place_of_residence"] == "back"
    assert merged["issue_date"] == "01/02/2024"
    assert merged["date_of_birth"] is None
    assert merged["field_sides"]["date_of_birth"] == "front"
    assert merged["address"] == merged["place_of_residence"]
    assert merged["card_layout"] == "cccd_2024"


def test_merge_falls_back_to_other_side_and_ignores_blank_values():
    merged = merge_id_card_fields({"issue_date": "01/02/2024"}, {"issue_date": "   "})

    assert merged["issue_date"] == "01/02/2024"
    assert merged["field_sides"]["issue_date"] == "front"
