package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.jsoup.nodes.Document;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

final class MinhNgocLiveResultPageStrategy implements MinhNgocResultPageStrategy {

    private static final String LIVE_BASE_URL = "https://www.minhngoc.net.vn/xo-so-truc-tiep";

    private final MinhNgocResultParser resultParser;

    MinhNgocLiveResultPageStrategy(MinhNgocResultParser resultParser) {
        this.resultParser = resultParser;
    }

    @Override
    public boolean supports(String region, LocalDate drawDate) {
        if (!drawDate.equals(LocalDate.now())) {
            return false;
        }
        LotteryRegionCode regionCode = LotteryRegionCode.valueOf(LotteryRegionCode.normalize(region));
        return regionCode == LotteryRegionCode.MIEN_NAM || regionCode == LotteryRegionCode.MIEN_TRUNG;
    }

    @Override
    public List<String> sourceUrls(String stationName, String region, LocalDate drawDate) {
        return List.of(LIVE_BASE_URL + "/" + regionPath(region) + ".html");
    }

    @Override
    public List<LotteryResultSourceItem> extractItems(
            Map<String, Document> documents,
            String stationName,
            String region,
            LocalDate drawDate
    ) {
        String sourceUrl = sourceUrls(stationName, region, drawDate).getFirst();
        return resultParser.parseLivePage(documents.get(sourceUrl), stationName, drawDate);
    }

    private String regionPath(String region) {
        return switch (LotteryRegionCode.valueOf(LotteryRegionCode.normalize(region))) {
            case MIEN_TRUNG -> "mien-trung";
            case MIEN_BAC -> "mien-bac";
            case MIEN_NAM -> "mien-nam";
        };
    }
}
