package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultSourceSyncPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySourceCrawlerPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source.LotterySourceDocumentBundle;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.LotteryResultSourceStrategy;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source.LotterySourceDocumentSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class LotteryResultSourceSyncAdapter implements LotteryResultSourceSyncPort {

    private final LotterySourceCrawlerPort lotterySourceCrawlerPort;
    private final Map<LotteryStationSourceType, LotteryResultSourceStrategy> strategies;

    public LotteryResultSourceSyncAdapter(
            LotterySourceCrawlerPort lotterySourceCrawlerPort,
            List<LotteryResultSourceStrategy> strategies
    ) {
        this.lotterySourceCrawlerPort = lotterySourceCrawlerPort;
        this.strategies = new EnumMap<>(LotteryStationSourceType.class);
        for (LotteryResultSourceStrategy strategy : strategies) {
            this.strategies.put(strategy.getSourceType(), strategy);
        }
    }

    @Override
    public LotteryResultSourcePreviewResult preview(
            LotteryStationSourceType sourceType,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        LotteryResultSourceStrategy strategy = strategies.get(sourceType);
        if (strategy == null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_RESULT_SOURCE_UNSUPPORTED,
                    "Nguồn dữ liệu kết quả không được hỗ trợ: " + sourceType
            );
        }

        List<String> sourceUrls = strategy.sourceUrls(stationName, region, drawDate);
        LotterySourceDocumentBundle documentBundle = LotterySourceDocumentSupport.fetchDocuments(
                sourceUrls,
                lotterySourceCrawlerPort::fetch
        );
        List<LotteryResultSourceItem> items = strategy.extractItems(
                documentBundle.documentByUrl(),
                stationName,
                region,
                drawDate
        );
        List<String> warnings = strategy.warnings(documentBundle.documentByUrl(), stationName, region, drawDate);

        if (items.isEmpty()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_RESULT_SOURCE_EMPTY,
                    "Nguồn dữ liệu không trả về kết quả hợp lệ cho đài " + stationName + " ngày " + drawDate
            );
        }

        log.info("[LotteryResultSource] Preview {} station={} region={} drawDate={} fetched {} items from {}",
                sourceType, stationName, region, drawDate, items.size(),
                documentBundle.primaryPageData() != null ? documentBundle.primaryPageData().requestUrl() : "n/a");

        return LotteryResultSourcePreviewResult.builder()
                .source(sourceType.name())
                .region(region)
                .stationName(stationName)
                .drawDate(drawDate)
                .requestUrl(documentBundle.primaryPageData() != null ? documentBundle.primaryPageData().requestUrl() : null)
                .pageTitle(documentBundle.primaryDocument() != null ? documentBundle.primaryDocument().title() : null)
                .fetchedAt(documentBundle.primaryPageData() != null ? documentBundle.primaryPageData().fetchedAt() : null)
                .totalItems(items.size())
                .warnings(warnings)
                .items(items)
                .rawPreview(LotterySourceDocumentSupport.rawPreview(documentBundle.primaryDocument()))
                .build();
    }
}
