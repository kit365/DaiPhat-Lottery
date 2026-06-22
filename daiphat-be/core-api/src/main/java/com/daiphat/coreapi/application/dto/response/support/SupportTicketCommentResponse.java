package com.daiphat.coreapi.application.dto.response.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record SupportTicketCommentResponse(
        Long id,
        UUID senderId,
        TicketCommentSenderRole senderRole,
        String content,
        String attachmentUrl,
        LocalDateTime createdAt
) {
}
