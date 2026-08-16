package com.daiphat.coreapi.application.dto.response.refund;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderRefundEligibilityResponse(
        boolean eligible,
        String reason,
        Long remainingSeconds,
        Integer graceMinutes,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime refundDeadlineAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime paymentSuccessAt,
        UUID orderId,
        String orderCode,
        String orderStatus,
        BigDecimal orderTotalAmount,
        LocalDateTime orderCreatedAt,
        List<RefundEligibleTicketItemResponse> refundTickets,
        BigDecimal totalRefundAmount,
        Integer maxRefundRequestsPerDay,
        Long refundRequestsSubmittedToday,
        Boolean dailyLimitReached
) {
}
