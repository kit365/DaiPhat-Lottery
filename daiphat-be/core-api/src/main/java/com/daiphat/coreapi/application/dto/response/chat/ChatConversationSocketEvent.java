package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record ChatConversationSocketEvent(
        ConversationSocketEventType eventType,
        Long conversationId,
        ConversationStatus status,
        UUID assignedOperatorId,
        /** Operator who had the live assignment before close/unassign (if any). */
        UUID lastAssignedOperatorId,
        /** User who closed the conversation (admin/staff); null for auto-close. */
        UUID closedBy,
        EscalationReason reason,
        LocalDateTime customerLastReadAt,
        LocalDateTime createdAt
) {
}
