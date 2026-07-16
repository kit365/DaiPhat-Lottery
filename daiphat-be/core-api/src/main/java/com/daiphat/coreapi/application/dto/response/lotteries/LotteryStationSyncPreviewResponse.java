package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LotteryStationSyncPreviewResponse(
        String source,
        String requestUrl,
        LocalDateTime fetchedAt,
        int totalFetched,
        String region,
        BigDecimal defaultPrice,
        List<LotteryStationSyncPreviewItemResponse> items
) {
}
