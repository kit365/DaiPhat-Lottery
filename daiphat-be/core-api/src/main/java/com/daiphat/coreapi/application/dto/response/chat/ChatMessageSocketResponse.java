package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record ChatMessageSocketResponse(
        Long id,
        Long conversationId,
        Long parentId,
        UUID senderId,
        String senderName,
        String content,
        MessageType type,
        LocalDateTime createdAt
) {
}
