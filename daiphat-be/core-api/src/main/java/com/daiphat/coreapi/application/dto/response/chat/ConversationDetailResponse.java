package com.daiphat.coreapi.application.dto.response.chat;

import lombok.Builder;

import java.util.List;

@Builder
public record ConversationDetailResponse(
        ConversationResponse conversation,
        List<MessageResponse> messages
) {
}
