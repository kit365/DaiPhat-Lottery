package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record ChatConversationEscalatedEvent(
        Long conversationId,
        UUID customerId,
        ConversationStatus status,
        UUID assignedOperatorId,
        EscalationReason reason,
        LocalDateTime customerLastReadAt,
        LocalDateTime occurredAt
) {
}
