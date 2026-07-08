package com.daiphat.coreapi.domain.model.enums.chat;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AiIntentConfigKey {
    DEFAULT_CONFIDENCE("defaultConfidence"),
    SLOT_ANSWER_CONFIDENCE("slotAnswerConfidence"),
    WITH_ENTITY_CONFIDENCE("withEntityConfidence"),
    WITHOUT_ENTITY_CONFIDENCE("withoutEntityConfidence"),
    WITH_TICKET_CONFIDENCE("withTicketConfidence"),
    WITHOUT_TICKET_CONFIDENCE("withoutTicketConfidence"),
    STATION_FUZZY_MATCH_THRESHOLD("stationFuzzyMatchThreshold"),
    STATION_FUZZY_AMBIGUITY_GAP("stationFuzzyAmbiguityGap");

    private final String jsonKey;
}
