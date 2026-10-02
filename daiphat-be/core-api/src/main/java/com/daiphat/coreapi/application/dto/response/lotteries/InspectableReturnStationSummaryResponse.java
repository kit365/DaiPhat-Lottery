package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record InspectableReturnStationSummaryResponse(
        Long lotteryStationId,
        String lotteryStationName,
        long eligibleSerialCount,
        BigDecimal totalImportCost
) {
}
