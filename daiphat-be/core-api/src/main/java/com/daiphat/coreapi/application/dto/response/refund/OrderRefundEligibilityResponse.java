package com.daiphat.coreapi.application.dto.response.refund;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderRefundEligibilityResponse(
        boolean eligible,
        String reason,
        Long remainingSeconds,
        Integer graceMinutes,
        LocalDateTime refundDeadlineAt,
        LocalDateTime paymentSuccessAt,
        UUID orderId,
        String orderCode,
        String orderStatus,
        BigDecimal orderTotalAmount,
        LocalDateTime orderCreatedAt,
        List<RefundEligibleTicketItemResponse> refundTickets,
        BigDecimal totalRefundAmount,
        Integer maxRefundRequestsPerDay,
        Long refundRequestsSubmittedToday,
        Integer refundRequestAllowedDays,
        LocalDateTime refundPeriodDeadlineAt,
        Boolean dailyLimitReached,
        Boolean refundPeriodExpired
) {
}
