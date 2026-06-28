package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.LotteryResultSourceStrategy;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class MinhNgocLotteryResultSourceStrategy implements LotteryResultSourceStrategy {

    private final MinhNgocResultStationSlugResolver slugResolver = new MinhNgocResultStationSlugResolver();
    private final MinhNgocResultParser resultParser = new MinhNgocResultParser();
    private final List<MinhNgocResultPageStrategy> pageStrategies = List.of(
            new MinhNgocLiveResultPageStrategy(resultParser),
            new MinhNgocDatedResultPageStrategy(slugResolver, resultParser)
    );

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.MINH_NGOC;
    }

    @Override
    public List<String> sourceUrls(String stationName, String region, LocalDate drawDate) {
        List<String> urls = new ArrayList<>();
        for (MinhNgocResultPageStrategy strategy : applicableStrategies(region, drawDate)) {
            urls.addAll(strategy.sourceUrls(stationName, region, drawDate));
        }
        return urls;
    }

    @Override
    public List<LotteryResultSourceItem> extractItems(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        for (MinhNgocResultPageStrategy strategy : applicableStrategies(region, drawDate)) {
            List<LotteryResultSourceItem> items = strategy.extractItems(documents, stationName, region, drawDate);
            if (!items.isEmpty()) {
                return items;
            }
        }
        return List.of();
    }

    @Override
    public List<String> warnings(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        List<String> warnings = new ArrayList<>();
        for (MinhNgocResultPageStrategy strategy : applicableStrategies(region, drawDate)) {
            warnings.addAll(strategy.warnings(documents, stationName, region, drawDate));
        }
        return warnings;
    }

    private List<MinhNgocResultPageStrategy> applicableStrategies(String region, LocalDate drawDate) {
        return pageStrategies.stream()
                .filter(strategy -> strategy.supports(region, drawDate))
                .toList();
    }
}
