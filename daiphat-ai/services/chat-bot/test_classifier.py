from classifier import classify_intent
from domain.enums.intent_enum import IntentEnum


def test_web_schedule_extracts_region():
    result = classify_intent("lịch quay miền nam")
    assert result.intent == IntentEnum.WEB_SCHEDULE
    assert result.entities.get("region") == "MIEN_NAM"
    assert result.suggested_reply is None


def test_web_result_extracts_ticket_number():
    result = classify_intent("dò vé 123456")
    assert result.intent == IntentEnum.WEB_RESULT
    assert result.entities.get("ticket_number") == "123456"
    assert result.suggested_reply is None


def test_web_search_extracts_suffix_fragment():
    result = classify_intent("có đuôi 68 không")
    assert result.intent == IntentEnum.WEB_SEARCH
    assert result.entities.get("ticket_fragment") == "68"
    assert result.entities.get("ticket_match_mode") == "suffix"
    assert result.suggested_reply is None


def test_web_search_extracts_prefix_fragment():
    result = classify_intent("có 2 số đầu 12 không")
    assert result.intent == IntentEnum.WEB_SEARCH
    assert result.entities.get("ticket_fragment") == "12"
    assert result.entities.get("ticket_match_mode") == "prefix"


def test_web_suggest_lucky_number():
    result = classify_intent("gợi ý vé số may mắn hôm nay")
    assert result.intent == IntentEnum.WEB_SUGGEST
    assert result.suggested_reply is None


def test_other_knowledge_has_no_suggested_reply():
    result = classify_intent("giải mã giấc mơ thấy rắn")
    assert result.intent == IntentEnum.OTHER_KNOWLEDGE
    assert result.suggested_reply is None


def test_nam_mo_thay_con_heo_is_other_knowledge():
    result = classify_intent("tôi nằm mơ thấy con heo")
    assert result.intent == IntentEnum.OTHER_KNOWLEDGE


def test_unknown_has_no_suggested_reply():
    result = classify_intent("xyz random question")
    assert result.intent == IntentEnum.UNKNOWN
    assert result.suggested_reply is None
