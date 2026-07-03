package com.daiphat.coreapi.application.dto.request.chat;

import lombok.Builder;

@Builder
public record InitConversationRequest(
        String title,
        String content,
        Boolean requestStaff
) {
}
