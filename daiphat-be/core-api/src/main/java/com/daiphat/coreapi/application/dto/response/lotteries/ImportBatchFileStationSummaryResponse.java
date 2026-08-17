package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * What one station of a draw date will become: a single import batch line, plus
 * the tickets underneath it.
 *
 * @param ticketCount distinct lottery numbers - one lottery_tickets row each
 * @param serialCount       physical tickets the file actually carries - one
 *                          lottery_ticket_serials row each
 * @param declaredQuantity  what the supplier says it delivered; this is what the
 *                          import batch line declares, so a shortfall shows up as
 *                          a partially imported line rather than disappearing
 */
@Builder
public record ImportBatchFileStationSummaryResponse(
        Long lotteryStationId,
        String stationName,
        int ticketCount,
        int serialCount,
        int declaredQuantity,
        BigDecimal importCost,
        BigDecimal declaredCostValue
) {
}
