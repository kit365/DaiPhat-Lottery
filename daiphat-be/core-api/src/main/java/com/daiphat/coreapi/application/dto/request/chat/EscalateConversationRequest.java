package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;

public record EscalateConversationRequest(
        EscalationReason reason
) {
}
