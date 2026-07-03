package com.daiphat.coreapi.domain.model.enums.chat;

import java.util.Arrays;
import java.util.Optional;

public enum ChatIntent {
    WEB_SEARCH,
    WEB_RESULT,
    WEB_SUGGEST,
    WEB_SCHEDULE,
    WEB_ACCOUNT,
    WEB_SUPPORT,
    TRASH_TALK,
    SYSTEM_ATTACK,
    OTHER_KNOWLEDGE,
    UNKNOWN,
    ESCALATE_REQUEST;

    public static Optional<ChatIntent> fromValue(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(intent -> intent.name().equalsIgnoreCase(value.trim()))
                .findFirst();
    }

    public boolean shouldEscalate() {
        return this == ESCALATE_REQUEST || this == UNKNOWN;
    }
}
