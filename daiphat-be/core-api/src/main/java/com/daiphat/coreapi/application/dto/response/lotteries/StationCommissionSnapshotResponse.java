package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record StationCommissionSnapshotResponse(
        Long lotteryStationId,
        Integer importedQuantity,
        BigDecimal systemCommissionRate,
        BigDecimal actualCommissionRate
) {
}
