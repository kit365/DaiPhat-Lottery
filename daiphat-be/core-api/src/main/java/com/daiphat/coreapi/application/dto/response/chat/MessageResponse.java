package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record MessageResponse(
        Long id,
        Long conversationId,
        Long parentId,
        UUID senderId,
        MessageSenderType senderType,
        String content,
        String intent,
        BigDecimal confidence,
        MessageType type,
        String fileUrl,
        String fileName,
        boolean isEdited,
        LocalDateTime editedAt,
        boolean isRead,
        int readerCount,
        boolean isDeleted,
        LocalDateTime deletedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
