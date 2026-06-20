package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record LotterySourceCrawlData(
        String requestUrl,
        String rawHtml,
        LocalDateTime fetchedAt
) {
}
