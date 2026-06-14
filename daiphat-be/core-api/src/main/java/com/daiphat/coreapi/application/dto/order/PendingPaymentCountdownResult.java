package com.daiphat.coreapi.application.dto.order;

import java.time.LocalDateTime;
import java.util.UUID;

public record PendingPaymentCountdownResult(
        UUID orderId,
        long remainingSeconds,
        LocalDateTime expiresAt,
        boolean expired
) {
}
