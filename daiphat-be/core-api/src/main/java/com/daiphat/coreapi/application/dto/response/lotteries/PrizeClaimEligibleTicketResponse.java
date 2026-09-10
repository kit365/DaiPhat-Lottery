package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Vé đã trả thưởng cho khách, đủ điều kiện đưa vào phiếu nộp nhà đài.
 */
@Builder
public record PrizeClaimEligibleTicketResponse(
        Long prizePayoutRequestId,
        String payoutRequestCode,
        Long serialId,
        String serialNumber,
        String ticketNumbers,
        Long stationId,
        String stationName,
        LocalDate drawDate,
        String prizeCode,
        String prizeDisplayName,
        BigDecimal grossPrizeAmount,
        BigDecimal netClaimAmount,
        BigDecimal taxAmount,
        BigDecimal commissionAmount,
        LocalDateTime payoutCompletedAt
) {
}
