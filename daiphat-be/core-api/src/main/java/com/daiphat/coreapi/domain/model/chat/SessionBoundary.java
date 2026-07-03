package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record SessionBoundary(
        Long conversationId,
        LocalDateTime sessionStartedAt,
        String gapLabel,
        ConversationCloseReason previousCloseReason,
        UUID previousOperatorId,
        LocalDateTime previousSessionEndedAt
) {
}
