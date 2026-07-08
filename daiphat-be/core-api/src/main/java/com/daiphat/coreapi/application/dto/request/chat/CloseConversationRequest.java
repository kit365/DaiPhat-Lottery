package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import lombok.Builder;

@Builder
public record CloseConversationRequest(
        ConversationCloseReason reason
) {
}
