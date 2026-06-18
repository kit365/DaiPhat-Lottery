package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import org.jsoup.nodes.Document;

import java.util.List;
import java.util.Map;

public interface LotteryStationSourceStrategy {

    LotteryStationSourceType getSourceType();

    List<String> sourceUrls(String region);

    List<LotteryStationSourceItem> extractItems(Map<String, Document> documents, String region);
}
