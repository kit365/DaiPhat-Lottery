package com.daiphat.coreapi.application.dto.response.refund;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record RefundEligibleTicketItemResponse(
        Long orderDetailId,
        String numbers,
        String serialNumber,
        String stationName,
        LocalDate drawDate,
        String ticketImg,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotalAmount,
        /** Serial status when incident applies (LOST / DAMAGED); null otherwise. */
        String serialStatus,
        String serialStatusLabel,
        boolean hasIncident,
        String faultedBy,
        String faultedByDisplayName,
        String damagedReason,
        String damagedEvidenceUrl
) {
}
