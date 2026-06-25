package com.daiphat.coreapi.application.dto.response.refund;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record RefundEligibleTicketItemResponse(
        Long orderDetailId,
        String numbers,
        String stationName,
        LocalDate drawDate,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotalAmount
) {
}
