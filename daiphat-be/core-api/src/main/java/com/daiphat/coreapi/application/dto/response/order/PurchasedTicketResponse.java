package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record PurchasedTicketResponse(
        UUID orderId,
        String orderCode,
        Long ticketId,
        String serialNumber,
        String numbers,
        String stationName,
        LocalDate drawDate,
        BigDecimal price,
        LocalDateTime purchasedAt,
        TicketDrawResultStatus drawResultStatus,
        String matchedPrizeCode,
        String matchedPrizeDisplayName
) {
}
