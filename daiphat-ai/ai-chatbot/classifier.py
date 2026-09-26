import re
import unicodedata
from dto.response.chat_classify_response import ChatClassifyResponse
from domain.enums.intent_enum import IntentEnum


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

def _strip_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics so 'lịch' and 'lich' compare equal."""
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", text)


def _normalize(text: str) -> str:
    """
    Canonical form used for ALL keyword matching:
    - Unicode NFC normalize (fixes composed/decomposed input from different keyboards)
    - lowercase
    - collapse internal whitespace
    - strip
    NOTE: this is the *accented* normalized form, kept separate from the
    diacritic-stripped form so we can match against both without keeping
    two hand-written keyword lists in sync.
    """
    text = unicodedata.normalize("NFC", text)
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def _match_any(norm_text: str, plain_text: str, keywords: list[str]) -> bool:
    """
    A keyword matches if it appears in the accented normalized text OR
    in the diacritic-stripped text (after also stripping diacritics from
    the keyword itself). This means keyword lists only need ONE
    (accented) spelling per phrase — no more manual "lich quay"/"lịch quay"
    duplication, and no silently-missing unaccented variants.
    """
    for kw in keywords:
        if kw in norm_text:
            return True
        if _strip_diacritics(kw) in plain_text:
            return True
    return False


# ---------------------------------------------------------------------------
# Keyword lists (accented spelling only — unaccented variants handled
# automatically by _match_any)
# ---------------------------------------------------------------------------

_SCHEDULE_KEYWORDS = [
    "lịch quay", "lịch mở thưởng", "giờ quay", "hôm nay quay", "ngày mai quay",
    "tra cứu đài", "lịch đài", "tìm đài", "quay số mấy giờ",
]
_SEARCH_KEYWORDS = [
    "tìm vé", "có số", "đuôi số", "đuôi", "số đầu", "đầu số", "đầu", "còn vé", "vé còn không",
]
_SUGGEST_KEYWORDS = [
    "gợi ý vé", "gợi ý số", "vé đẹp", "chọn vé", "con số may mắn", "số may mắn",
]
_RESULT_KEYWORDS = ["kết quả", "xổ số", "trúng không", "dò vé", "kqxs", "trúng thưởng"]
_ACCOUNT_KEYWORDS = [
    "đơn hàng", "mua vé", "thanh toán", "chưa nhận được", "lỗi nạp tiền",
    "nạp tiền", "hủy đơn", "hoàn tiền", "rút tiền",
]
_ESCALATE_KEYWORDS = [
    "nhân viên", "người thật", "tư vấn viên", "hỗ trợ trực tiếp", "người hỗ trợ",
    "gặp admin", "gặp shop",
]
_FORTUNE_KEYWORDS = [
    "giấc mơ", "nằm mơ", "mơ thấy", "chiêm bao", "sổ mơ",
    "giải mã giấc mơ", "giải mộng", "phong thủy", "tử vi",
    "chiêm tinh", "bói mộng", "mơ con",
]


# Greeting/small-talk: matched as WHOLE normalized message (not substring),
# after stripping trailing punctuation, so "chào bạn ơi!!" and "Alo" work too.
_TRASH_TALK_EXACT = {
    "hi", "hey", "alo", "chao", "chao ban", "chao shop", "xin chao",
    "hello", "helo",
}

# Region aliases -> canonical code. Matched against diacritic-stripped text.
_REGION_ALIASES = {
    "MIEN_NAM": ["mien nam", "mn", "sai gon", "hcm", "tp hcm"],
    "MIEN_TRUNG": ["mien trung", "mt", "da nang"],
    "MIEN_BAC": ["mien bac", "mb", "ha noi"],
}

# Amount/date with separators (200.000, 200,000, 14/07/2026) — bare tickets stay intact.
_MONEY_OR_DATE_PATTERN = re.compile(r"\d[\d.,/]*[.,/]\d[\d.,/]*")
_TICKET_PATTERN = re.compile(r"\b\d{5,6}\b")
_TICKET_FRAGMENT_PATTERN = re.compile(r"\b\d{2,6}\b")


def _extract_region(plain_text: str) -> str | None:
    for code, aliases in _REGION_ALIASES.items():
        for alias in aliases:
            # word-boundary check for short aliases (mn/mt/mb) to avoid
            # matching inside unrelated words/numbers
            if len(alias) <= 3:
                if re.search(rf"\b{re.escape(alias)}\b", plain_text):
                    return code
            elif alias in plain_text:
                return code
    return None


def _extract_ticket_number(norm_text: str) -> str | None:
    """
    Pick a 5-6 digit token that looks like a ticket number, skipping
    tokens that are actually money amounts or dates (which contain
    separators like '.', ',', '/' immediately adjacent to the digits).
    Prefers the LAST standalone match in the message, since ticket
    numbers are usually mentioned after context words like 'dò vé'.
    """
    cleaned = _MONEY_OR_DATE_PATTERN.sub(" ", norm_text)
    matches = _TICKET_PATTERN.findall(cleaned)
    return matches[-1] if matches else None


def _extract_ticket_fragment(norm_text: str) -> str | None:
    """Last 2–6 digit token suitable for inventory search (suffix / prefix / exact)."""
    full = _extract_ticket_number(norm_text)
    if full:
        return full
    cleaned = _MONEY_OR_DATE_PATTERN.sub(" ", norm_text)
    matches = _TICKET_FRAGMENT_PATTERN.findall(cleaned)
    return matches[-1] if matches else None


def _ticket_match_mode(norm_text: str, plain_text: str, fragment: str | None) -> str:
    if _match_any(norm_text, plain_text, ["đuôi", "duoi"]):
        return "suffix"
    if _match_any(norm_text, plain_text, ["số đầu", "so dau", "đầu số", "dau so", "đầu", "dau"]):
        return "prefix"
    if fragment and len(fragment) >= 6:
        return "exact"
    return "suffix"


def classify_intent(message: str, conversation_id: int = None) -> ChatClassifyResponse:
    """
    Fallback classifier when Spring Java keyword classifier is uncertain.
    Structured intents return suggested_reply=None — Spring handlers own the reply.
    """
    if not message or not message.strip():
        return ChatClassifyResponse(
            intent=IntentEnum.UNKNOWN,
            confidence=0.0,
            entities={},
            suggested_reply=None,
        )

    norm_text = _normalize(message)
    plain_text = _strip_diacritics(norm_text)

    if _match_any(norm_text, plain_text, _ESCALATE_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.ESCALATE_REQUEST,
            confidence=0.95,
            entities={},
            suggested_reply=None,
        )

    if _match_any(norm_text, plain_text, _ACCOUNT_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_ACCOUNT,
            confidence=0.80,
            entities={},
            suggested_reply=None,
        )

    # Inventory search/suggest before result/schedule so "vé" maps to DB tickets.
    if _match_any(norm_text, plain_text, _SEARCH_KEYWORDS) or (
        _extract_ticket_fragment(norm_text)
        and _match_any(norm_text, plain_text, ["có", "đuôi", "tìm", "vé"])
        and not _match_any(norm_text, plain_text, _RESULT_KEYWORDS)
    ):
        fragment = _extract_ticket_fragment(norm_text)
        entities = {}
        if fragment:
            entities["ticket_fragment"] = fragment
            entities["ticket_match_mode"] = _ticket_match_mode(norm_text, plain_text, fragment)
            if len(fragment) >= 5:
                entities["ticket_number"] = fragment
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_SEARCH,
            confidence=0.88 if fragment else 0.75,
            entities=entities,
            suggested_reply=None,
        )

    if _match_any(norm_text, plain_text, _SUGGEST_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_SUGGEST,
            confidence=0.85,
            entities={},
            suggested_reply=None,
        )

    # Result before schedule: "kqxs miền nam" is results, not draw time.
    if _match_any(norm_text, plain_text, _RESULT_KEYWORDS):
        ticket_number = _extract_ticket_number(norm_text)
        region = _extract_region(plain_text)
        entities = {}
        if ticket_number:
            entities["ticket_number"] = ticket_number
        if region:
            entities["region"] = region
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_RESULT,
            confidence=0.85 if ticket_number else 0.70,
            entities=entities,
            suggested_reply=None,
        )

    region = _extract_region(plain_text)
    if _match_any(norm_text, plain_text, _SCHEDULE_KEYWORDS) or region:
        entities = {}
        if region:
            entities["region"] = region
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_SCHEDULE,
            confidence=0.88 if region else 0.75,
            entities=entities,
            suggested_reply=None,
        )

    if _match_any(norm_text, plain_text, _FORTUNE_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.OTHER_KNOWLEDGE,
            confidence=0.82,
            entities={},
            suggested_reply=None,
        )

    trash_talk_text = plain_text.strip(" !.?~")
    if trash_talk_text in _TRASH_TALK_EXACT:
        return ChatClassifyResponse(
            intent=IntentEnum.TRASH_TALK,
            confidence=0.90,
            entities={},
            suggested_reply=None,
        )

    return ChatClassifyResponse(
        intent=IntentEnum.UNKNOWN,
        confidence=0.3,
        entities={},
        suggested_reply=None,
    )
