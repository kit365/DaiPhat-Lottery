package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import com.daiphat.coreapi.application.service.lotteries.LotteryRegionDrawTimeResolver;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.LotteryStationSourceStrategy;
import lombok.RequiredArgsConstructor;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class MinhNgocLotteryStationSourceStrategy implements LotteryStationSourceStrategy {

    private static final String SOUTHERN_CATALOG_URL = "https://www.minhngoc.net.vn/xo-so-mien-nam.html";
    private static final String CENTRAL_CATALOG_URL = "https://www.minhngoc.net.vn/xo-so-mien-trung.html";
    private static final String NORTHERN_CATALOG_URL = "https://www.minhngoc.net.vn/xo-so-mien-bac.html";
    private static final String SCHEDULE_URL = "https://www.minhngoc.net.vn/thong-tin/lich-quay-so-mo-thuong.html";
    private static final String FALLBACK_SCHEDULE_URL = "https://xoso.com.vn/lich-quay-xo-so.html";

    private final LotteryRegionDrawTimeResolver lotteryRegionDrawTimeResolver;
    private final MinhNgocStationNameNormalizer stationNameNormalizer = new MinhNgocStationNameNormalizer();
    private final MinhNgocCatalogParser catalogParser = new MinhNgocCatalogParser(stationNameNormalizer);
    private final MinhNgocScheduleParser scheduleParser = new MinhNgocScheduleParser(stationNameNormalizer);
    private final MinhNgocFallbackScheduleParser fallbackScheduleParser =
            new MinhNgocFallbackScheduleParser(stationNameNormalizer);

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.MINH_NGOC;
    }

    @Override
    public List<String> sourceUrls(String region) {
        return List.of(catalogUrlFor(region), SCHEDULE_URL, FALLBACK_SCHEDULE_URL);
    }

    @Override
    public List<LotteryStationSourceItem> extractItems(Map<String, Document> documents, String region) {
        String normalizedRegion = normalizeRegion(region);
        String catalogUrl = catalogUrlFor(normalizedRegion);

        Map<String, LotteryStationSourceItem> catalogItems = catalogParser.parse(
                documents.get(catalogUrl),
                normalizedRegion,
                resultPathPrefix(normalizedRegion)
        );
        Map<String, List<String>> drawDaysByStation = scheduleParser.parseDrawDays(
                documents.get(SCHEDULE_URL),
                normalizedRegion
        );
        if (drawDaysByStation.isEmpty()) {
            drawDaysByStation = fallbackScheduleParser.parse(documents.get(FALLBACK_SCHEDULE_URL), normalizedRegion);
        }

        String drawTime = scheduleParser.parseDrawTime(documents.get(SCHEDULE_URL), normalizedRegion);
        if (drawTime == null) {
            drawTime = lotteryRegionDrawTimeResolver.resolveFormattedDrawTime(normalizedRegion);
        }

        List<LotteryStationSourceItem> mergedItems = new ArrayList<>();
        for (Map.Entry<String, LotteryStationSourceItem> entry : catalogItems.entrySet()) {
            String key = entry.getKey();
            LotteryStationSourceItem item = entry.getValue();
            List<String> drawDays = drawDaysByStation.getOrDefault(key, List.of());
            mergedItems.add(LotteryStationSourceItem.builder()
                    .name(item.name())
                    .canonicalName(item.canonicalName())
                    .region(item.region())
                    .drawTime(drawTime)
                    .drawDays(drawDays)
                    .sourcePath(item.sourcePath())
                    .note(buildMergedNote(drawDays))
                    .build());
        }
        return mergedItems;
    }

    private String buildMergedNote(List<String> drawDays) {
        if (drawDays.isEmpty()) {
            return "Catalog parsed from Minh Ngoc, schedule not matched";
        }
        return "Catalog + schedule parsed from Minh Ngoc";
    }

    private String normalizeRegion(String region) {
        return LotteryRegionCode.normalize(region);
    }

    private String catalogUrlFor(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> CENTRAL_CATALOG_URL;
            case MIEN_BAC -> NORTHERN_CATALOG_URL;
            case MIEN_NAM -> SOUTHERN_CATALOG_URL;
        };
    }

    private String resultPathPrefix(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> "/ket-qua-xo-so/mien-trung/";
            case MIEN_BAC -> "/ket-qua-xo-so/mien-bac/";
            case MIEN_NAM -> "/ket-qua-xo-so/mien-nam/";
        };
    }
}
