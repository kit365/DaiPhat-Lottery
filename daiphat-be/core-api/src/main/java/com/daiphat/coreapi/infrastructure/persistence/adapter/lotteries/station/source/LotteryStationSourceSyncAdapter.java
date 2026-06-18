package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewItem;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewResult;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySourceCrawlerPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.LotteryStationSourceStrategy;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Slf4j
public class LotteryStationSourceSyncAdapter implements LotteryStationSourceSyncPort {

    private final LotterySourceCrawlerPort lotterySourceCrawlerPort;
    private final Map<LotteryStationSourceType, LotteryStationSourceStrategy> strategies;

    public LotteryStationSourceSyncAdapter(
            LotterySourceCrawlerPort lotterySourceCrawlerPort,
            List<LotteryStationSourceStrategy> strategies
    ) {
        this.lotterySourceCrawlerPort = lotterySourceCrawlerPort;
        this.strategies = new EnumMap<>(LotteryStationSourceType.class);
        for (LotteryStationSourceStrategy strategy : strategies) {
            this.strategies.put(strategy.getSourceType(), strategy);
        }
    }

    @Override
    public LotteryStationSourcePreviewResult preview(LotteryStationSourceType sourceType, String region) {
        LotteryStationSourceStrategy strategy = strategies.get(sourceType);
        if (strategy == null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_STATION_SYNC_SOURCE_UNSUPPORTED,
                    "Nguồn dữ liệu không được hỗ trợ: " + sourceType
            );
        }
        List<String> sourceUrls = strategy.sourceUrls(region);

        Map<String, LotterySourceCrawlData> crawlDataByUrl = new LinkedHashMap<>();
        Map<String, Document> documentByUrl = new LinkedHashMap<>();
        for (String sourceUrl : sourceUrls) {
            LotterySourceCrawlData pageData = lotterySourceCrawlerPort.fetch(sourceUrl);
            crawlDataByUrl.put(sourceUrl, pageData);
            documentByUrl.put(sourceUrl, Jsoup.parse(pageData.rawHtml(), pageData.requestUrl()));
        }

        String primaryUrl = sourceUrls.isEmpty() ? null : sourceUrls.getFirst();
        LotterySourceCrawlData primaryPageData = primaryUrl != null ? crawlDataByUrl.get(primaryUrl) : null;
        Document primaryDocument = primaryUrl != null ? documentByUrl.get(primaryUrl) : null;
        List<LotteryStationSourceItem> items = strategy.extractItems(documentByUrl, region);

        log.info("[LotteryStationSource] Preview {} region={} fetched {} items from {}",
                sourceType, region, items.size(), primaryPageData != null ? primaryPageData.requestUrl() : "n/a");

        return LotteryStationSourcePreviewResult.builder()
                .source(sourceType.name())
                .requestUrl(primaryPageData != null ? primaryPageData.requestUrl() : null)
                .pageTitle(primaryDocument != null ? primaryDocument.title() : null)
                .fetchedAt(primaryPageData != null ? primaryPageData.fetchedAt() : null)
                .totalItems(items.size())
                .items(items.stream()
                        .map(this::toPreviewItem)
                        .collect(Collectors.toList()))
                .rawPreview(primaryDocument != null ? buildRawPreview(primaryDocument) : null)
                .build();
    }

    private LotteryStationSourcePreviewItem toPreviewItem(LotteryStationSourceItem item) {
        return LotteryStationSourcePreviewItem.builder()
                .name(item.name())
                .canonicalName(item.canonicalName())
                .region(item.region())
                .drawTime(item.drawTime())
                .drawDays(item.drawDays())
                .sourcePath(item.sourcePath())
                .note(item.note())
                .build();
    }

    private String buildRawPreview(Document document) {
        String html = document.outerHtml();
        return html.length() <= 2000 ? html : html.substring(0, 2000);
    }
}
