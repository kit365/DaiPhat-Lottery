package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Station-scoped quantity of missing import tickets, optionally split by condition.
 * {@code ticketCondition} is per row (UNDER_IMPORTED / DAMAGED / LOST / VOIDED);
 * when null the parent resolve request condition is used.
 */
public record SettlementImportPlaceholderRequest(
        @NotNull Long lotteryStationId,
        @NotNull @Min(1) Integer quantity,
        TicketCondition ticketCondition
) {
    public SettlementImportPlaceholderRequest(Long lotteryStationId, Integer quantity) {
        this(lotteryStationId, quantity, null);
    }
}
