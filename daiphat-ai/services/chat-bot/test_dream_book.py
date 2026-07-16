from dream_book import (
    build_fortune_reply,
    extract_dream_subject,
    find_symbol,
    normalize_message,
    numbers_from_subject,
)


def test_find_symbol_heo():
    symbol = find_symbol("tôi nằm mơ thấy con heo")
    assert symbol is not None
    assert symbol.label == "heo"
    assert "02" in symbol.numbers


def test_find_symbol_bo_not_trau():
    symbol = find_symbol("tôi nằm mơ thấy con bò")
    assert symbol is not None
    assert symbol.label == "bò"
    assert "09" in symbol.numbers


def test_find_symbol_gian():
    symbol = find_symbol("tôi nằm mơ thấy con gián")
    assert symbol is not None
    assert symbol.label == "gián"


def test_build_fortune_reply_heo():
    reply, numbers, symbol = build_fortune_reply("tôi nằm mơ thấy con heo")
    assert symbol == "heo"
    assert numbers == ["02", "12", "22", "32", "36", "52"]
    assert "heo" in reply
    assert "02" in reply
    assert "quý khách" in reply
    assert "chỉ mang tính tham khảo" in reply
    assert "Mình sẽ" not in reply
    assert "tham khảo vui" not in reply
    assert "hệ thống" not in reply


def test_build_fortune_reply_gian_not_clarify():
    reply, numbers, symbol = build_fortune_reply("tôi nằm mơ thấy con gián")
    assert symbol == "gián"
    assert numbers
    assert "gián" in reply
    assert "cho biết đã mơ thấy gì" not in reply


def test_build_fortune_reply_may_bay_fallback():
    reply, numbers, symbol = build_fortune_reply("tôi nằm mơ thấy máy bay")
    assert symbol == "máy bay"
    assert len(numbers) == 3
    assert all(len(n) == 2 and n.isdigit() for n in numbers)
    assert "máy bay" in reply
    assert "chỉ mang tính tham khảo" in reply


def test_numbers_from_subject_stable():
    key = normalize_message("may bay")
    assert numbers_from_subject(key) == numbers_from_subject(key)


def test_extract_dream_subject():
    assert extract_dream_subject("Tôi nằm mơ thấy con gián nhé") == "gián"
    assert "xe máy" in (extract_dream_subject("chiêm bao thấy chiếc xe máy") or "")


def test_build_fortune_reply_without_animal():
    reply, numbers, symbol = build_fortune_reply("hỏi phong thủy giúp tôi")
    assert symbol is None
    assert numbers == []
    assert "cho biết đã mơ thấy gì" in reply
    assert "quý khách" in reply
    assert "hệ thống" not in reply
