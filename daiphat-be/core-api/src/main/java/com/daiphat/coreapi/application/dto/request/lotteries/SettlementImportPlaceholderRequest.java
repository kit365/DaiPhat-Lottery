package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Station-scoped quantity of missing import tickets to materialize as incident placeholders
 * (LOST / DAMAGED / VOIDED / UNDER_IMPORTED per resolve request ticketCondition).
 */
public record SettlementImportPlaceholderRequest(
        @NotNull Long lotteryStationId,
        @NotNull @Min(1) Integer quantity
) {
}
