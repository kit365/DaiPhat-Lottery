package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record PreviousStaffSessionBrief(
        Long conversationId,
        LocalDateTime closedAt,
        ConversationCloseReason closeReason,
        String closeReasonLabel,
        UUID operatorId,
        String operatorName
) {
}
