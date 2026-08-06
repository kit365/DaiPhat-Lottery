package com.daiphat.coreapi.application.dto.request.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpsertLuckyPatternConfigRequest(
        @NotNull LuckyPatternType patternType,
        String exactNumbers,
        String matchDigits,
        LuckyMatchPosition matchPosition,
        @NotBlank String name,
        String description,
        @NotBlank String badgeLabel,
        String badgeColor,
        Integer priority,
        Boolean active
) {
}
