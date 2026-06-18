package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record LotteryStationSyncItemResponse(
        Long stationId,
        String name,
        String canonicalName,
        String action,
        String note
) {
}
