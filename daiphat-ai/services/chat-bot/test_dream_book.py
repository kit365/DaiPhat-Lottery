from dream_book import build_fortune_reply, find_symbol


def test_find_symbol_heo():
    symbol = find_symbol("tôi nằm mơ thấy con heo")
    assert symbol is not None
    assert symbol.label == "heo"
    assert "02" in symbol.numbers


def test_build_fortune_reply_heo():
    reply, numbers, symbol = build_fortune_reply("tôi nằm mơ thấy con heo")
    assert symbol == "heo"
    assert numbers == ["02", "12", "22", "32", "36", "52"]
    assert "heo" in reply
    assert "02" in reply


def test_build_fortune_reply_without_animal():
    reply, numbers, symbol = build_fortune_reply("hỏi phong thủy giúp tôi")
    assert symbol is None
    assert numbers == []
    assert "mô tả rõ hơn" in reply
