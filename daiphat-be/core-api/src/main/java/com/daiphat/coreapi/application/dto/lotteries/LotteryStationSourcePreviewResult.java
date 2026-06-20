package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LotteryStationSourcePreviewResult(
        String source,
        String requestUrl,
        String pageTitle,
        LocalDateTime fetchedAt,
        int totalItems,
        List<LotteryStationSourcePreviewItem> items,
        String rawPreview
) {
}
