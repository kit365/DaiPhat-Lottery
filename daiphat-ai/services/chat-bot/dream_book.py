"""Vietnamese folk dream-book (sổ mơ) animal/symbol → lucky 2-digit fragments.

Numbers are conventional folk associations for consultancy chat only —
they are never claimed as actual ticket numbers (inventory comes from DB).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class DreamSymbol:
    label: str
    aliases: tuple[str, ...]
    numbers: tuple[str, ...]


# Prefer multi-word / distinctive aliases — short ambiguous words ("cho", "de") are omitted.
_DREAM_SYMBOLS: tuple[DreamSymbol, ...] = (
    DreamSymbol("heo", ("con heo", "heo", "con lon", "lon"), ("02", "12", "22", "32", "36", "52")),
    DreamSymbol("rắn", ("con ran", "ran"), ("05", "15", "35", "65")),
    DreamSymbol("chó", ("con cho", "cun"), ("07", "17", "27", "67")),
    DreamSymbol("mèo", ("con meo", "meo"), ("04", "14", "24", "34")),
    DreamSymbol("gà", ("con ga", "ga"), ("08", "18", "28", "38")),
    DreamSymbol("trâu", ("con trau", "trau", "con bo"), ("09", "19", "49")),
    DreamSymbol("hổ", ("con ho", "cop", "con cop"), ("03", "13", "23", "33")),
    DreamSymbol("rồng", ("con rong", "rong"), ("06", "16", "26")),
    DreamSymbol("ngựa", ("con ngua", "ngua"), ("21", "41", "61")),
    DreamSymbol("dê", ("con de"), ("25", "45", "55")),
    DreamSymbol("khỉ", ("con khi"), ("29", "39", "59")),
    DreamSymbol("chuột", ("con chuot", "chuot"), ("01", "11", "31")),
    DreamSymbol("thỏ", ("con tho", "tho"), ("10", "20", "30")),
    DreamSymbol("cá", ("con ca"), ("33", "43", "53")),
    DreamSymbol("rùa", ("con rua", "rua"), ("48", "58")),
    DreamSymbol("voi", ("con voi", "voi"), ("42", "62")),
    DreamSymbol("vịt", ("con vit", "vit"), ("44", "64")),
)


def _strip_diacritics(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", text)


def normalize_message(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text).lower().strip()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text)
    return _strip_diacritics(text)


def _contains_alias(normalized: str, alias: str) -> bool:
    """Token-boundary contains check so 'ga' does not match inside 'gia'."""
    if not alias:
        return False
    haystack = f" {normalized} "
    needle = f" {alias} "
    return needle in haystack


def find_symbol(message: str) -> DreamSymbol | None:
    normalized = normalize_message(message)
    if not normalized:
        return None
    best: DreamSymbol | None = None
    best_len = -1
    for symbol in _DREAM_SYMBOLS:
        for alias in symbol.aliases:
            key = normalize_message(alias)
            if key and _contains_alias(normalized, key) and len(key) > best_len:
                best = symbol
                best_len = len(key)
    return best


def build_fortune_reply(message: str) -> tuple[str, list[str], str | None]:
    """Returns (reply, lucky_numbers, symbol_label)."""
    symbol = find_symbol(message)
    if symbol is None:
        reply = (
            "Mình đã nhận câu hỏi phong thủy/giấc mơ của bạn. "
            "Bạn thử mô tả rõ hơn (vd: \"nằm mơ thấy con heo\") để mình tra sổ mơ "
            "và tìm vé khớp số trong kho nhé."
        )
        return reply, [], None

    numbers = list(symbol.numbers)
    numbers_text = ", ".join(numbers)
    reply = (
        f"Theo sổ mơ dân gian, mơ thấy \"{symbol.label}\" thường gắn với các số: {numbers_text}. "
        "Mình sẽ tìm giúp các vé đang bán trong kho khớp đuôi số này "
        "(chỉ mang tính tham khảo vui)."
    )
    return reply, numbers, symbol.label
