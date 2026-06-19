package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySourceCrawlerPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source.LotterySourceDocumentSupport;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.PrizeStructureSourceStrategy;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class PrizeStructureSourceSyncAdapter implements PrizeStructureSourceSyncPort {

    private final LotterySourceCrawlerPort lotterySourceCrawlerPort;
    private final Map<LotteryStationSourceType, PrizeStructureSourceStrategy> strategies;

    public PrizeStructureSourceSyncAdapter(
            LotterySourceCrawlerPort lotterySourceCrawlerPort,
            List<PrizeStructureSourceStrategy> strategies
    ) {
        this.lotterySourceCrawlerPort = lotterySourceCrawlerPort;
        this.strategies = new EnumMap<>(LotteryStationSourceType.class);
        for (PrizeStructureSourceStrategy strategy : strategies) {
            this.strategies.put(strategy.getSourceType(), strategy);
        }
    }

    @Override
    public PrizeStructureSourcePreviewResult preview(LotteryStationSourceType sourceType, String region) {
        PrizeStructureSourceStrategy strategy = strategies.get(sourceType);
        if (strategy == null) {
            throw new DomainException(
                    ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_UNSUPPORTED,
                    "Nguồn dữ liệu cấu trúc giải chưa được hỗ trợ: " + sourceType
            );
        }

        List<String> sourceUrls = strategy.sourceUrls(region);
        Map<String, LotterySourceCrawlData> crawlDataByUrl = new LinkedHashMap<>();
        Map<String, Document> documentByUrl = new LinkedHashMap<>();
        for (String sourceUrl : sourceUrls) {
            LotterySourceCrawlData pageData = lotterySourceCrawlerPort.fetch(sourceUrl);
            crawlDataByUrl.put(sourceUrl, pageData);
            documentByUrl.put(sourceUrl, LotterySourceDocumentSupport.parse(pageData));
        }

        String primaryUrl = sourceUrls.isEmpty() ? null : sourceUrls.getFirst();
        LotterySourceCrawlData primaryPageData = primaryUrl != null ? crawlDataByUrl.get(primaryUrl) : null;
        Document primaryDocument = primaryUrl != null ? documentByUrl.get(primaryUrl) : null;
        List<PrizeStructureSourceItem> items = strategy.extractItems(documentByUrl, region);
        List<String> warnings = strategy.warnings(documentByUrl, region);

        log.info("[PrizeStructureSource] Preview {} region={} fetched {} items from {}",
                sourceType, region, items.size(), primaryPageData != null ? primaryPageData.requestUrl() : "n/a");

        return PrizeStructureSourcePreviewResult.builder()
                .source(sourceType.name())
                .region(region)
                .requestUrl(primaryPageData != null ? primaryPageData.requestUrl() : null)
                .pageTitle(primaryDocument != null ? primaryDocument.title() : null)
                .fetchedAt(primaryPageData != null ? primaryPageData.fetchedAt() : null)
                .totalItems(items.size())
                .warnings(warnings)
                .items(items)
                .rawPreview(LotterySourceDocumentSupport.rawPreview(primaryDocument))
                .build();
    }
}
