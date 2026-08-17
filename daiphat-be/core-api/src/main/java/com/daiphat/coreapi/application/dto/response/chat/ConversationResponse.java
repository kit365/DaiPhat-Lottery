package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record ConversationResponse(
        Long id,
        String title,
        ConversationStatus status,
        UUID customerId,
        UUID assignedOperatorId,
        String assignedOperatorName,
        String customerName,
        LocalDateTime customerLastReadAt,
        LocalDateTime operatorLastReadAt,
        Integer unreadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deletedAt,
        EscalationReason escalationReason,
        LocalDateTime escalatedAt,
        String handoffSummary
) {
}
