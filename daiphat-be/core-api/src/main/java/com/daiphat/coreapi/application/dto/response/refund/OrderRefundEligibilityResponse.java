package com.daiphat.coreapi.application.dto.response.refund;

import java.time.LocalDateTime;

public record OrderRefundEligibilityResponse(
        boolean eligible,
        String reason,
        Long remainingSeconds,
        Integer graceMinutes,
        LocalDateTime refundDeadlineAt
) {
}
