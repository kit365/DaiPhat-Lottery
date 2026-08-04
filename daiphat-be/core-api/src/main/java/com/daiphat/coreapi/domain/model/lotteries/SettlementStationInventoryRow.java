package com.daiphat.coreapi.domain.model.lotteries;

import java.math.BigDecimal;

/**
 * Station-level inventory aggregates for a supplier settlement.
 */
public record SettlementStationInventoryRow(
        Long lotteryStationId,
        String lotteryStationName,
        long importedQuantity,
        long soldQuantity,
        long remainingQuantity,
        long damagedQuantity,
        long lostQuantity,
        long voidedQuantity,
        long returnQuantity,
        BigDecimal returnValue
) {
}
