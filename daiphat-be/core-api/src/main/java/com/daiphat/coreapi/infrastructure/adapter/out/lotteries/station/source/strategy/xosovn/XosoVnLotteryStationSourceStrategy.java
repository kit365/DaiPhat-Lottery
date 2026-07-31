package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.xosovn;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import com.daiphat.coreapi.application.service.lotteries.LotteryRegionDrawTimeResolver;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.LotteryStationSourceStrategy;
import lombok.RequiredArgsConstructor;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class XosoVnLotteryStationSourceStrategy implements LotteryStationSourceStrategy {

    private static final String SOURCE_URL = "https://www.kqxs.vn/";
    private static final String SCHEDULE_URL = "https://xoso.com.vn/lich-quay-xo-so.html";

    private final LotteryRegionDrawTimeResolver lotteryRegionDrawTimeResolver;
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
            drawTime = lotteryRegionDrawTimeResolver.resolveFormattedDrawTime(normalizedRegion);
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
        return LotteryRegionCode.normalize(region);
    }

    private String regionPathPrefix(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> "/mien-trung/xo-so-";
            case MIEN_BAC -> "/mien-bac/xo-so-";
            case MIEN_NAM -> "/mien-nam/xo-so-";
            default -> "/mien-nam/xo-so-";
        };
    }
}
