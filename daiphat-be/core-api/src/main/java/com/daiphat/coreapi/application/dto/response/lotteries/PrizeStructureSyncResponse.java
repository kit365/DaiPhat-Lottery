package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record PrizeStructureSyncResponse(
        String source,
        String region,
        String requestUrl,
        LocalDateTime fetchedAt,
        int totalFetched,
        int createdCount,
        int updatedCount,
        int deletedCount,
        int skippedCount,
        List<String> warnings,
        List<PrizeStructureSyncItemResponse> items
) {
}
