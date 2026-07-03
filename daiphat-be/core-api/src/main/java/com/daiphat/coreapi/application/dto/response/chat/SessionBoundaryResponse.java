package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record SessionBoundaryResponse(
        Long conversationId,
        LocalDateTime sessionStartedAt,
        String gapLabel,
        ConversationCloseReason previousCloseReason,
        String previousCloseReasonLabel,
        UUID previousOperatorId,
        String previousOperatorName,
        LocalDateTime previousSessionEndedAt
) {
}
