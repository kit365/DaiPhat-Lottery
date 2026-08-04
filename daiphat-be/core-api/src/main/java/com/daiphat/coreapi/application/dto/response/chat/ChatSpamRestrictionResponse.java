package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.chat.ChatSpamRestriction;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ChatSpamRestrictionResponse(
        boolean restricted,
        LocalDateTime until,
        String tier,
        int spamCount24h,
        LocalDateTime lastSpamAt
) {
    public static ChatSpamRestrictionResponse from(ChatSpamRestriction restriction) {
        if (restriction == null) {
            return ChatSpamRestrictionResponse.builder()
                    .restricted(false)
                    .spamCount24h(0)
                    .build();
        }
        return ChatSpamRestrictionResponse.builder()
                .restricted(restriction.restricted())
                .until(restriction.until())
                .tier(restriction.tier() != null ? restriction.tier().name() : null)
                .spamCount24h(restriction.spamCount24h())
                .lastSpamAt(restriction.lastSpamAt())
                .build();
    }
}
