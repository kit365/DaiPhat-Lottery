package com.daiphat.coreapi.application.dto.response.support;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderComplaintEligibilityResponse(
        boolean eligible,
        String categoryCode,
        String reasonCode,
        String message,
        boolean requiresEvidence,
        Long remainingSeconds,
        LocalDateTime eligibleAt,
        LocalDateTime expiresAt,
        UUID orderId,
        String orderStatus
) {
}
