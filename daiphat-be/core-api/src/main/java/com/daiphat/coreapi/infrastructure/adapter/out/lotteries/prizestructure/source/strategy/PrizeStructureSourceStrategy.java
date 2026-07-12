package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.prizestructure.source.strategy;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import org.jsoup.nodes.Document;

import java.util.List;
import java.util.Map;

public interface PrizeStructureSourceStrategy {

    LotteryStationSourceType getSourceType();

    List<String> sourceUrls(String region);

    List<PrizeStructureSourceItem> extractItems(Map<String, Document> documents, String region);

    default List<String> warnings(Map<String, Document> documents, String region) {
        return List.of();
    }
}
