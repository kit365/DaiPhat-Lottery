package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record ImportBatchBlockedStationResponse(
        Long lotteryStationId,
        String name,
        Long existingDraftBatchId,
        String blockedReason
) {
}
