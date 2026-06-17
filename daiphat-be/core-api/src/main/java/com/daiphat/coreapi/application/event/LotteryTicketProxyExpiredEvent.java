package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record LotteryTicketProxyExpiredEvent(
        Long ticketId,
        String ticketNumber
) {
}
