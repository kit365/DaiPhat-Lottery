package com.daiphat.coreapi.application.dto.chat.intent;

import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;

public sealed interface ChatIntentOutcome {

    record BotReply(String content, String displayContent, String intent) implements ChatIntentOutcome {
        public BotReply(String content, String intent) {
            this(content, null, intent);
        }

        public String effectiveDisplayContent() {
            return displayContent != null && !displayContent.isBlank() ? displayContent : content;
        }
    }

    record Escalate(EscalationReason reason, String message) implements ChatIntentOutcome {
    }
}
