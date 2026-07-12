package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import org.jsoup.nodes.Document;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

interface MinhNgocResultPageStrategy {

    boolean supports(String region, LocalDate drawDate);

    List<String> sourceUrls(String stationName, String region, LocalDate drawDate);

    List<LotteryResultSourceItem> extractItems(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    );

    default List<String> warnings(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        return List.of();
    }
}
