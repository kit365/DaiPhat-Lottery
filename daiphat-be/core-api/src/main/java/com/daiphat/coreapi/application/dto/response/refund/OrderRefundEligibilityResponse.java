package com.daiphat.coreapi.application.dto.response.refund;

public record OrderRefundEligibilityResponse(
        boolean eligible,
        String reason,
        Long remainingSeconds,
        String closingTime
) {
}
