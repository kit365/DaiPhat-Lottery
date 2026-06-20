package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.PrizeStructureSourceStrategy;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class MinhNgocPrizeStructureSourceStrategy implements PrizeStructureSourceStrategy {

    private static final String NORTHERN_REGION = LotteryRegionCode.MIEN_BAC.name();
    private static final String SOUTHERN_URL = "https://www.minhngoc.net.vn/thong-tin/co-cau-giai-thuong-mien-nam.html";
    private static final String CENTRAL_URL = "https://www.minhngoc.net.vn/thong-tin/co-cau-giai-thuong-mien-trung.html";
    private static final String NORTHERN_URL = "https://www.minhngoc.net.vn/thong-tin/co-cau-giai-thuong-mien-bac.html";

    private final MinhNgocSouthernPrizeStructureParser southernPrizeStructureParser =
            new MinhNgocSouthernPrizeStructureParser();

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.MINH_NGOC;
    }

    @Override
    public List<String> sourceUrls(String region) {
        String normalizedRegion = normalizeRegion(region);
        if (NORTHERN_REGION.equals(normalizedRegion)) {
            throw new DomainException(
                    ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_UNSUPPORTED,
                    "Đồng bộ cơ cấu giải miền Bắc từ Minh Ngọc đang được phát triển."
            );
        }
        return List.of(sourceUrlFor(normalizedRegion));
    }

    @Override
    public List<PrizeStructureSourceItem> extractItems(Map<String, Document> documents, String region) {
        String normalizedRegion = normalizeRegion(region);
        Document document = documents.get(sourceUrlFor(normalizedRegion));
        return switch (LotteryRegionCode.valueOf(normalizedRegion)) {
            case MIEN_TRUNG, MIEN_NAM -> southernPrizeStructureParser.parse(document, normalizedRegion);
            case MIEN_BAC -> List.of();
        };
    }

    private String normalizeRegion(String region) {
        return region == null ? LotteryRegionCode.DEFAULT_VALUE : LotteryRegionModel.normalizeCode(region);
    }

    private String sourceUrlFor(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> CENTRAL_URL;
            case MIEN_BAC -> NORTHERN_URL;
            case MIEN_NAM -> SOUTHERN_URL;
        };
    }
}
