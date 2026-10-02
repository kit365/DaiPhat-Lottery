package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;

/** Availability of purchasable physical serials, never a reservation. */
public record TicketInventoryResponse(
        Long lotteryTicketId,
        long availableQuantity,
        LotteryTicketStatus status,
        TicketCondition ticketCondition,
        boolean purchasable,
        boolean valid,
        String message
) {}
