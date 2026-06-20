package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record PrizeStructureSourcePreviewResult(
        String source,
        String region,
        String requestUrl,
        String pageTitle,
        LocalDateTime fetchedAt,
        int totalItems,
        List<String> warnings,
        List<PrizeStructureSourceItem> items,
        String rawPreview
) {
}
