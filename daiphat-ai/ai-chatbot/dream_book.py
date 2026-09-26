"""Vietnamese folk dream-book (sổ mơ) → lucky 2-digit fragments.

Known animals/objects keep curated folk numbers. Any other dream subject
extracted from natural phrasing still gets stable reference numbers for
inventory search (never invented ticket serials).
"""

from __future__ import annotations

import re
import unicodedata
import zlib
from dataclasses import dataclass


@dataclass(frozen=True)
class DreamSymbol:
    label: str
    aliases: tuple[str, ...]
    numbers: tuple[str, ...]


# Prefer multi-word / distinctive aliases — short ambiguous words ("cho", "de", "bo") are omitted.
_DREAM_SYMBOLS: tuple[DreamSymbol, ...] = (
    DreamSymbol("heo", ("con heo", "heo", "con lon", "lon"), ("02", "12", "22", "32", "36", "52")),
    DreamSymbol("rắn", ("con ran", "ran"), ("05", "15", "35", "65")),
    DreamSymbol("chó", ("con cho", "cun"), ("07", "17", "27", "67")),
    DreamSymbol("mèo", ("con meo", "meo"), ("04", "14", "24", "34")),
    DreamSymbol("gà", ("con ga", "ga"), ("08", "18", "28", "38")),
    DreamSymbol("bò", ("con bo", "bo sua", "con bo sua"), ("09", "19", "49")),
    DreamSymbol("trâu", ("con trau", "trau"), ("09", "19", "49")),
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
    DreamSymbol("gián", ("con gian", "gian"), ("18", "28", "58")),
    DreamSymbol("kiến", ("con kien", "kien"), ("14", "24", "54")),
    DreamSymbol("muỗi", ("con muoi", "muoi"), ("16", "26", "56")),
    DreamSymbol("nhện", ("con nhen", "nhen"), ("17", "27", "57")),
    DreamSymbol("ong", ("con ong", "ong mat"), ("15", "35", "55")),
    DreamSymbol("bướm", ("con buom", "buom"), ("19", "39", "59")),
    DreamSymbol("tiền", ("tien", "tien bac", "tien vang"), ("08", "18", "68")),
    DreamSymbol("nhà", ("ngoi nha", "can nha"), ("07", "27", "47")),
    DreamSymbol("xe", ("xe may", "o to", "xe hoi"), ("09", "29", "49")),
    DreamSymbol("nước", ("nuoc", "song", "bien"), ("02", "22", "52")),
    DreamSymbol("lửa", ("lua", "ngon lua"), ("03", "23", "53")),
    DreamSymbol("hoa", ("bong hoa", "hoa hong"), ("06", "26", "46")),
    DreamSymbol("cây", ("cay coi", "cay xanh"), ("04", "24", "44")),
)

_DREAM_SUBJECT = re.compile(
    r"(?iu)(?:nằm\s+mơ|chiêm\s+bao|giấc\s+mơ|\bmơ)\s+(?:thấy|về|đến|tới)\s+(.+)$"
)
_LEADING_CLASSIFIER = re.compile(
    r"(?iu)^(con|cái|chiếc|cây|quả|trái|tờ|lá|người|ông|bà|anh|chị|em|bé|đứa|một|những|các)\s+"
)
_TRAILING_NOISE = re.compile(
    r"(?iu)\s+(thì|là|nhé|nha|ạ|à|ơi|giúp|cho\s+tôi|cho\s+mình|với|nhé\.?|\.|,|!|\?).*$"
)
_STOP_SUBJECTS = {
    "gi",
    "gi do",
    "cai gi",
    "thu gi",
    "gi do ay",
    "gi vay",
    "sao",
    "the nao",
}
_CLAUSE_BREAK = {"thi", "la", "va", "roi", "nhung", "ma", "nen", "giup", "cho"}


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


def extract_dream_subject(message: str) -> str | None:
    if not message or not message.strip():
        return None
    text = unicodedata.normalize("NFC", message).strip()
    match = _DREAM_SUBJECT.search(text)
    if not match:
        return None
    raw = match.group(1).strip()
    raw = _TRAILING_NOISE.sub("", raw).strip()
    raw = re.sub(r"[\"'“”]+", "", raw).strip()
    if not raw:
        return None

    tokens = raw.split()
    phrase: list[str] = []
    for index, token in enumerate(tokens[:6]):
        norm_token = normalize_message(token)
        if index > 0 and (norm_token in _STOP_SUBJECTS or norm_token in _CLAUSE_BREAK):
            break
        phrase.append(token)

    subject = " ".join(phrase).strip()
    subject = _LEADING_CLASSIFIER.sub("", subject).strip()
    if not subject:
        return None
    normalized_subject = normalize_message(subject)
    if len(normalized_subject) < 2 or normalized_subject in _STOP_SUBJECTS:
        return None
    return subject


def numbers_from_subject(normalized_subject: str) -> list[str]:
    key = (normalized_subject or "").strip()
    if not key:
        return ["00", "27", "68"]
    seed = zlib.crc32(key.encode("utf-8")) & 0xFFFFFFFF
    numbers: list[str] = []
    seen: set[str] = set()
    cursor = seed
    guard = 0
    while len(numbers) < 3 and guard < 32:
        guard += 1
        value = cursor % 100
        fragment = f"{value:02d}"
        if fragment not in seen:
            seen.add(fragment)
            numbers.append(fragment)
        cursor = cursor * 31 + 17 + len(numbers)
    return numbers


def build_fortune_reply(message: str) -> tuple[str, list[str], str | None]:
    """Returns (reply, lucky_numbers, symbol_label)."""
    symbol = find_symbol(message)
    if symbol is not None:
        numbers = list(symbol.numbers)
        label = symbol.label
    else:
        subject = extract_dream_subject(message)
        if subject is None:
            reply = (
                "Đại Phát đã nhận câu hỏi về giấc mơ của quý khách. "
                "Quý khách vui lòng cho biết đã mơ thấy gì "
                "(ví dụ: \"nằm mơ thấy con heo\", \"nằm mơ thấy tiền\") "
                "để Đại Phát tra sổ mơ và gợi ý vé phù hợp nhé."
            )
            return reply, [], None
        label = subject
        numbers = numbers_from_subject(normalize_message(subject))

    numbers_text = ", ".join(numbers)
    reply = (
        f"Đại Phát tra sổ mơ dân gian giúp quý khách: mơ thấy \"{label}\" "
        f"thường gắn với các số {numbers_text}. "
        "Thông tin này chỉ mang tính tham khảo nhé."
    )
    return reply, numbers, label
