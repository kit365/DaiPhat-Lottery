package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PendingPaymentReminderResponse(
        UUID orderId,
        String orderCode,
        BigDecimal totalAmount,
        long remainingSeconds,
        LocalDateTime expiresAt,
        boolean expired,
        Long transactionId,
        PaymentGateway gateway
) {
}
