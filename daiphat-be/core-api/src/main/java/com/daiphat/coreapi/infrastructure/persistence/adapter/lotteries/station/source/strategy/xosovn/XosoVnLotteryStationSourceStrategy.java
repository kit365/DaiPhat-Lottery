package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.xosovn;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.LotteryStationSourceStrategy;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class XosoVnLotteryStationSourceStrategy implements LotteryStationSourceStrategy {

    private static final String SOURCE_URL = "https://www.kqxs.vn/";
    private static final String SCHEDULE_URL = "https://xoso.com.vn/lich-quay-xo-so.html";
    private static final String SOUTHERN_REGION = "MIEN_NAM";
    private static final String CENTRAL_REGION = "MIEN_TRUNG";
    private static final String NORTHERN_REGION = "MIEN_BAC";

    private final XosoVnStationNameNormalizer stationNameNormalizer = new XosoVnStationNameNormalizer();
    private final XosoVnCatalogParser catalogParser = new XosoVnCatalogParser(stationNameNormalizer);
    private final XosoVnScheduleParser scheduleParser = new XosoVnScheduleParser(stationNameNormalizer);

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.XOSO_VN;
    }

    @Override
    public List<String> sourceUrls(String region) {
        return List.of(SOURCE_URL, SCHEDULE_URL);
    }

    @Override
    public List<LotteryStationSourceItem> extractItems(Map<String, Document> documents, String region) {
        String normalizedRegion = normalizeRegion(region);
        String drawTime = scheduleParser.parseDrawTime(documents.get(SOURCE_URL), normalizedRegion);
        if (drawTime == null) {
            drawTime = defaultDrawTime(normalizedRegion);
        }

        Map<String, List<String>> drawDaysByStation = scheduleParser.parseDrawDays(
                documents.get(SCHEDULE_URL),
                normalizedRegion
        );

        return catalogParser.parse(
                documents.get(SOURCE_URL),
                normalizedRegion,
                regionPathPrefix(normalizedRegion),
                drawTime,
                drawDaysByStation
        );
    }

    private String normalizeRegion(String region) {
        return region == null ? SOUTHERN_REGION : region.trim().toUpperCase();
    }

    private String regionPathPrefix(String region) {
        return switch (normalizeRegion(region)) {
            case CENTRAL_REGION -> "/mien-trung/xo-so-";
            case NORTHERN_REGION -> "/mien-bac/xo-so-";
            default -> "/mien-nam/xo-so-";
        };
    }

    private String defaultDrawTime(String region) {
        return switch (normalizeRegion(region)) {
            case CENTRAL_REGION -> "17:15";
            case NORTHERN_REGION -> "18:15";
            default -> "16:15";
        };
    }
}
