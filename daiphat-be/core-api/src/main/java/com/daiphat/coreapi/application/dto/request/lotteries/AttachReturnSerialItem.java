package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotNull;

public record AttachReturnSerialItem(
        @NotNull Long serialId,
        Boolean manualOverride,
        String overrideReason,
        String overrideEvidenceUrl
) {
}
