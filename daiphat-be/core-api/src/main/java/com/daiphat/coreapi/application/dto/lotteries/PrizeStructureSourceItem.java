package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PrizeStructureSourceItem(
        String region,
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        String description,
        BigDecimal prizeValue,
        Integer quantity,
        Integer matchDigits,
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder,
        Boolean isActive,
        String note
) {
}
