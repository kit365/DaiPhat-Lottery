package com.daiphat.coreapi.application.dto.order;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OrderTicketSnapshot(
        Long lotteryTicketId,
        Long lotteryTicketSerialId,
        BigDecimal price,
        LocalDate drawDate
) {
}
