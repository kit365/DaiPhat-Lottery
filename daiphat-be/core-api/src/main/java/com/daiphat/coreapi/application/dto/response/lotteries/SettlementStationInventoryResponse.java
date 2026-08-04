package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SettlementStationInventoryResponse(
        Long lotteryStationId,
        String lotteryStationName,
        int importedQuantity,
        int soldQuantity,
        int remainingQuantity,
        int damagedQuantity,
        int lostQuantity,
        int voidedQuantity,
        int returnQuantity,
        BigDecimal returnValue
) {
}
