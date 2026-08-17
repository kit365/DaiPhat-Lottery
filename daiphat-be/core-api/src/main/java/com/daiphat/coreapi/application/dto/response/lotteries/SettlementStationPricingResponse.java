package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * Per-station matching prices. {@code importCost} is the NCC face import price
 * ({@code defaultImportCost} / settlement snapshot), not {@code lottery_stations.price}.
 * {@code netUnitPrice} is {@code importCost × (1 − commissionRate)}.
 */
@Builder
public record SettlementStationPricingResponse(
        Long lotteryStationId,
        String lotteryStationName,
        int importedQuantity,
        BigDecimal importCost,
        BigDecimal commissionRate,
        BigDecimal netUnitPrice,
        BigDecimal actualCommissionRate
) {
}
