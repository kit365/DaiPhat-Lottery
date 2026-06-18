package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.xosovn;

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
public class XosoVnPrizeStructureSourceStrategy implements PrizeStructureSourceStrategy {

    private static final String SOUTHERN_REGION = "MIEN_NAM";
    private static final String CENTRAL_REGION = "MIEN_TRUNG";
    private static final String NORTHERN_REGION = "MIEN_BAC";
    private static final String DIFFERENCE_ARTICLE_URL =
            "https://xoso.com.vn/tin-xo-so/nhung-diem-khac-nhau-co-ban-giua-xo-so-kien-thiet-3-mien-404-147259.html";

    private final XosoVnSouthernPrizeStructureParser southernPrizeStructureParser =
            new XosoVnSouthernPrizeStructureParser();

    @Override
    public LotteryStationSourceType getSourceType() {
        return LotteryStationSourceType.XOSO_VN;
    }

    @Override
    public List<String> sourceUrls(String region) {
        String normalized = normalizeRegion(region);
        if (NORTHERN_REGION.equals(normalized)) {
            throw new DomainException(
                    ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_UNSUPPORTED,
                    "Đồng bộ cơ cấu giải miền Bắc từ Xoso.vn đang được phát triển."
            );
        }
        return switch (normalized) {
            case CENTRAL_REGION, SOUTHERN_REGION -> List.of(DIFFERENCE_ARTICLE_URL);
            default -> List.of(DIFFERENCE_ARTICLE_URL);
        };
    }

    @Override
    public List<PrizeStructureSourceItem> extractItems(Map<String, Document> documents, String region) {
        String normalized = normalizeRegion(region);
        return switch (normalized) {
            case CENTRAL_REGION, SOUTHERN_REGION -> southernPrizeStructureParser.parse(normalized);
            default -> List.of();
        };
    }

    @Override
    public List<String> warnings(Map<String, Document> documents, String region) {
        return List.of(
                "Xoso.vn hiện không có trang text chuẩn cho full bảng cơ cấu giải miền Nam/Trung; hệ thống đang dùng template chuẩn 6 số như backup source."
        );
    }

    private String normalizeRegion(String region) {
        return region == null ? SOUTHERN_REGION : LotteryRegionModel.normalizeCode(region);
    }
}
