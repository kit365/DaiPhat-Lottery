package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.PrizeStructureSourceStrategy;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class MinhNgocPrizeStructureSourceStrategy implements PrizeStructureSourceStrategy {

    private static final String SOUTHERN_REGION = "MIEN_NAM";
    private static final String CENTRAL_REGION = "MIEN_TRUNG";
    private static final String NORTHERN_REGION = "MIEN_BAC";
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
        return switch (normalizedRegion) {
            case CENTRAL_REGION, SOUTHERN_REGION -> southernPrizeStructureParser.parse(document, normalizedRegion);
            default -> List.of();
        };
    }

    private String normalizeRegion(String region) {
        return region == null ? SOUTHERN_REGION : LotteryRegionModel.normalizeCode(region);
    }

    private String sourceUrlFor(String region) {
        return switch (normalizeRegion(region)) {
            case CENTRAL_REGION -> CENTRAL_URL;
            case NORTHERN_REGION -> NORTHERN_URL;
            default -> SOUTHERN_URL;
        };
    }
}
