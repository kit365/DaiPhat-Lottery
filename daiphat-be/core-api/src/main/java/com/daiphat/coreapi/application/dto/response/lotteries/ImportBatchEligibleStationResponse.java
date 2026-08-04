package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ImportBatchEligibleStationResponse(
        Long lotteryStationId,
        String name,
        ImportBatchType resolvedBatchType,
        BigDecimal price,
        BigDecimal commissionRate
) {
}
