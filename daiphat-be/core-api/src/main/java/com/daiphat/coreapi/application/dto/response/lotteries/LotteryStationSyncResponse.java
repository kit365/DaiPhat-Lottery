package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LotteryStationSyncResponse(
        String source,
        String requestUrl,
        LocalDateTime fetchedAt,
        int totalFetched,
        int createdCount,
        int updatedCount,
        int skippedCount,
        List<String> warnings,
        List<LotteryStationSyncItemResponse> items
) {
}
