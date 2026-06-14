package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.enums.order.PaymentGateway;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record TransactionResponse(
        Long id,
        UUID orderId,
        BigDecimal amount,
        PaymentGateway gateway,
        Long gatewayOrderCode,
        String paymentRef,
        TransactionStatus status,
        LocalDateTime paidAt,
        LocalDateTime cancelledAt,
        String failureReason,
        LocalDateTime codCollectedAt,
        UUID codCollectedBy,
        String note,
        TransactionType type
) {
}
