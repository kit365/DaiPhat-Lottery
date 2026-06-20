package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.LotteryResultSourceStrategy;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Component
public class MinhNgocLotteryResultSourceStrategy implements LotteryResultSourceStrategy {

    private static final String BASE_URL = "https://www.minhngoc.com.vn/ket-qua-xo-so";
    private static final String SOUTHERN_REGION = LotteryRegionCode.MIEN_NAM.name();
    private static final String CENTRAL_REGION = LotteryRegionCode.MIEN_TRUNG.name();
    private static final String NORTHERN_REGION = LotteryRegionCode.MIEN_BAC.name();
    private static final DateTimeFormatter DATE_PATH_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final MinhNgocResultStationSlugResolver slugResolver = new MinhNgocResultStationSlugResolver();
    private final MinhNgocResultParser resultParser = new MinhNgocResultParser();

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.MINH_NGOC;
    }

    @Override
    public List<String> sourceUrls(String stationName, String region, LocalDate drawDate) {
        String regionPath = regionPath(region);
        String slug = slugResolver.toSlug(stationName);
        String datePath = drawDate.format(DATE_PATH_FORMATTER);

        return List.of(BASE_URL + "/" + regionPath + "/" + slug + "/" + datePath + ".html");
    }

    @Override
    public List<LotteryResultSourceItem> extractItems(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        String sourceUrl = sourceUrls(stationName, region, drawDate).getFirst();
        Document document = documents.get(sourceUrl);
        return resultParser.parse(document, stationName, drawDate);
    }

    @Override
    public List<String> warnings(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        String sourceUrl = sourceUrls(stationName, region, drawDate).getFirst();
        Document document = documents.get(sourceUrl);
        return resultParser.warnings(document, drawDate);
    }

    private String regionPath(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> "mien-trung";
            case MIEN_BAC -> "mien-bac";
            case MIEN_NAM -> "mien-nam";
            default -> "mien-nam";
        };
    }

    private String normalizeRegion(String region) {
        return LotteryRegionCode.normalize(region);
    }
}
