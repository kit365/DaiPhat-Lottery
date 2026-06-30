package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ConversationResponse(
        Long id,
        String title,
        ConversationStatus status,
        Integer unreadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deletedAt
) {
}
