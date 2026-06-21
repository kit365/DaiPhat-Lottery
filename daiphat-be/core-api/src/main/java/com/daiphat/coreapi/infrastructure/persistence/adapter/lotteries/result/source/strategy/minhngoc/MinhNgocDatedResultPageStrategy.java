package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.jsoup.nodes.Document;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

final class MinhNgocDatedResultPageStrategy implements MinhNgocResultPageStrategy {

    private static final String BASE_URL = "https://www.minhngoc.com.vn/ket-qua-xo-so";
    private static final DateTimeFormatter DATE_PATH_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final MinhNgocResultStationSlugResolver slugResolver;
    private final MinhNgocResultParser resultParser;

    MinhNgocDatedResultPageStrategy(
            MinhNgocResultStationSlugResolver slugResolver,
            MinhNgocResultParser resultParser
    ) {
        this.slugResolver = slugResolver;
        this.resultParser = resultParser;
    }

    @Override
    public boolean supports(String region, LocalDate drawDate) {
        return true;
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
        return resultParser.parseDatedPage(documents.get(sourceUrl), stationName, drawDate);
    }

    @Override
    public List<String> warnings(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        String sourceUrl = sourceUrls(stationName, region, drawDate).getFirst();
        return resultParser.warnings(documents.get(sourceUrl), drawDate);
    }

    private String regionPath(String region) {
        return switch (LotteryRegionCode.valueOf(LotteryRegionCode.normalize(region))) {
            case MIEN_TRUNG -> "mien-trung";
            case MIEN_BAC -> "mien-bac";
            case MIEN_NAM -> "mien-nam";
        };
    }
}
