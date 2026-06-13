package com.daiphat.coreapi.application.dto.order;

import java.math.BigDecimal;

public record OrderTicketSnapshot(
        Long ticketId,
        BigDecimal price
) {
}
