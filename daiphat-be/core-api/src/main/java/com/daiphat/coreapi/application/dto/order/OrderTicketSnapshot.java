package com.daiphat.coreapi.application.dto.order;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OrderTicketSnapshot(
        Long ticketId,
        BigDecimal price,
        LocalDate drawDate
) {
}
