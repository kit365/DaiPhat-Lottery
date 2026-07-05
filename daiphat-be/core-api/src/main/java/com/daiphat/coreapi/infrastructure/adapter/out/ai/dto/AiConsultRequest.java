package com.daiphat.coreapi.infrastructure.adapter.out.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiConsultRequest(
        String message,
        @JsonProperty("conversation_id") Long conversationId
) {
}
