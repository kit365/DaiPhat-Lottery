package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SupplierSettlementKpisResponse(
        int totalImportedTickets,
        BigDecimal totalImportValue,
        int totalSoldTickets,
        int totalRemainingTickets,
        int totalDamagedTickets,
        int totalLostTickets,
        int totalVoidedTickets,
        int totalPreparedForReturnTickets,
        /**
         * EXPIRED serials on this settlement's import batches that are not linked to any order_detail.
         */
        int totalExpiredReturnTickets,
        BigDecimal totalReturnValue,
        BigDecimal remainingPayableAmount,
        Boolean isReturnExpired,
        BigDecimal expiredReturnValue
) {
}
