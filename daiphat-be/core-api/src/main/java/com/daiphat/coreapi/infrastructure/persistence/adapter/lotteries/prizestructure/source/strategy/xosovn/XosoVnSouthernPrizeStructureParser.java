package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.prizestructure.source.strategy.xosovn;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;

import java.math.BigDecimal;
import java.util.List;

class XosoVnSouthernPrizeStructureParser {

    List<PrizeStructureSourceItem> parse(String region) {
        return List.of(
                standard(region, PrizeLevel.SPECIAL, "Giải đặc biệt", "DB", 2_000_000_000L, 1, 6, 0),
                standard(region, PrizeLevel.FIRST, "Giải nhất", "G1", 30_000_000L, 1, 5, 1),
                standard(region, PrizeLevel.SECOND, "Giải hai", "G2", 15_000_000L, 1, 5, 2),
                standard(region, PrizeLevel.THIRD, "Giải ba", "G3", 10_000_000L, 2, 5, 3),
                standard(region, PrizeLevel.FOURTH, "Giải bốn", "G4", 3_000_000L, 7, 5, 4),
                standard(region, PrizeLevel.FIFTH, "Giải năm", "G5", 1_000_000L, 10, 4, 5),
                standard(region, PrizeLevel.SIXTH, "Giải sáu", "G6", 400_000L, 30, 4, 6),
                standard(region, PrizeLevel.SEVENTH, "Giải bảy", "G7", 200_000L, 100, 3, 7),
                standard(region, PrizeLevel.EIGHTH, "Giải tám", "G8", 100_000L, 1_000, 2, 8),
                buildTemplateDerivedPrizeStructure(
                        region,
                        PrizeLevel.SUB_SPECIAL,
                        "DB_PHU",
                        "Xoso.vn không lộ bảng text đầy đủ cho miền Nam/Trung; hệ thống dùng template chuẩn 09 giải phụ đặc biệt.",
                        BigDecimal.valueOf(50_000_000L),
                        9,
                        MatchFrom.SPECIAL_CONSOLATION_1,
                        9
                ),
                buildTemplateDerivedPrizeStructure(
                        region,
                        PrizeLevel.CONSOLATION,
                        "KK",
                        "Xoso.vn không lộ bảng text đầy đủ cho miền Nam/Trung; hệ thống dùng template chuẩn 45 giải khuyến khích.",
                        BigDecimal.valueOf(6_000_000L),
                        45,
                        MatchFrom.SPECIAL_CONSOLATION_2,
                        10
                )
        );
    }

    private PrizeStructureSourceItem standard(
            String region,
            PrizeLevel prizeLevel,
            String prizeDisplayName,
            String prizeCode,
            long prizeValue,
            int quantity,
            int matchDigits,
            int displayOrder
    ) {
        return PrizeStructureSourceItem.builder()
                .region(region)
                .prizeLevel(prizeLevel.name())
                .prizeDisplayName(prizeDisplayName)
                .prizeCode(prizeCode)
                .description(null)
                .prizeValue(BigDecimal.valueOf(prizeValue))
                .quantity(quantity)
                .matchDigits(matchDigits)
                .matchFrom(resolveMatchFrom(prizeLevel).name())
                .matchFromDisplayName(resolveMatchFrom(prizeLevel).getDisplayName())
                .displayOrder(displayOrder)
                .isActive(true)
                .note("Supplemented from standard template")
                .build();
    }

    private MatchFrom resolveMatchFrom(PrizeLevel prizeLevel) {
        return PrizeLevel.SPECIAL.equals(prizeLevel) ? MatchFrom.EXACT : MatchFrom.LAST;
    }

    private PrizeStructureSourceItem buildTemplateDerivedPrizeStructure(
            String region,
            PrizeLevel prizeLevel,
            String prizeCode,
            String description,
            BigDecimal prizeValue,
            Integer quantity,
            MatchFrom matchFrom,
            Integer displayOrder
    ) {
        return PrizeStructureSourceItem.builder()
                .region(region)
                .prizeLevel(prizeLevel.name())
                .prizeDisplayName(prizeLevel.getDisplayName())
                .prizeCode(prizeCode)
                .description(description)
                .prizeValue(prizeValue)
                .quantity(quantity)
                .matchDigits(5)
                .matchFrom(matchFrom.name())
                .matchFromDisplayName(matchFrom.getDisplayName())
                .displayOrder(displayOrder)
                .isActive(true)
                .note("Supplemented from standard template")
                .build();
    }
}
