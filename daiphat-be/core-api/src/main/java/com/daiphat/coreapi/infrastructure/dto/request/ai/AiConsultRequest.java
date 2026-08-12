package com.daiphat.coreapi.infrastructure.dto.request.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiConsultRequest(
        String message,
        @JsonProperty("conversation_id") Long conversationId
) {
}
