package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * Per-station sale price / commission used on the settlement matching table.
 * {@code netUnitPrice} is {@code importCost × (1 − commissionRate)}.
 */
@Builder
public record SettlementStationPricingResponse(
        Long lotteryStationId,
        String lotteryStationName,
        int importedQuantity,
        BigDecimal importCost,
        BigDecimal commissionRate,
        BigDecimal netUnitPrice
) {
}
