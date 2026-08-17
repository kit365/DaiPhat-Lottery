package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Aggregate status of a lottery number for one station and draw date.
 * Every value here is derived by the system from the ticket's serials and the
 * station draw cutoff; there is no manual transition. The per-unit lifecycle
 * (reserved, sold, proxy-held, damaged, lost, voided, ...) lives on
 * {@link LotteryTicketSerialStatus}. A lottery number cancelled for data-entry
 * mistakes is soft-deleted ({@code deletedAt}); its serials are reassigned to the
 * replacement lottery number via {@code ticket_id}.
 */
@Getter
@RequiredArgsConstructor
public enum LotteryTicketStatus {
    IMPORTING("Đang nhập lô"),
    IN_STOCK("Trong kho"),
    SOLD_OUT("Hết hàng"),
    EXPIRED("Hết hạn");

    private final String displayName;
}
