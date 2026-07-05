package com.daiphat.coreapi.application.dto.chat.intent;

import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;

public sealed interface ChatIntentOutcome {

    record BotReply(String content, String intent) implements ChatIntentOutcome {
    }

    record Escalate(EscalationReason reason, String message) implements ChatIntentOutcome {
    }
}
