package com.daiphat.coreapi.domain.model.chat;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ChatSpamRestriction(
        boolean restricted,
        LocalDateTime until,
        Tier tier,
        int spamCount24h,
        LocalDateTime lastSpamAt
) {
    public enum Tier {
        SOFT,
        REPEAT
    }

    public static ChatSpamRestriction clear(int spamCount24h, LocalDateTime lastSpamAt) {
        return ChatSpamRestriction.builder()
                .restricted(false)
                .until(null)
                .tier(null)
                .spamCount24h(spamCount24h)
                .lastSpamAt(lastSpamAt)
                .build();
    }
}
