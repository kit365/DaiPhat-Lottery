package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LotteryResultSourcePreviewResult(
        String source,
        String region,
        String stationName,
        LocalDate drawDate,
        String requestUrl,
        String pageTitle,
        LocalDateTime fetchedAt,
        int totalItems,
        List<String> warnings,
        List<LotteryResultSourceItem> items,
        String rawPreview
) {
}
