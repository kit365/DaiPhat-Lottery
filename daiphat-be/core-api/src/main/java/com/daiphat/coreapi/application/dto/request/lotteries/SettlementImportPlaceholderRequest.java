package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Station-scoped quantity of missing import tickets to materialize as LOST placeholders.
 */
public record SettlementImportPlaceholderRequest(
        @NotNull Long lotteryStationId,
        @NotNull @Min(1) Integer quantity
) {
}
