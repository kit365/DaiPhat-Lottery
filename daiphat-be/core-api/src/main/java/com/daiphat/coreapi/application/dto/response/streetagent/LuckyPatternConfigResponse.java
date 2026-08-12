package com.daiphat.coreapi.application.dto.response.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;

public record LuckyPatternConfigResponse(
        Long id, LuckyPatternType patternType, String exactNumbers, String matchDigits,
        LuckyMatchPosition matchPosition, String name, String description, String badgeLabel,
        String badgeColor, Integer priority, Boolean active
) {
}
