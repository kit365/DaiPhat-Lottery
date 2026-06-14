package com.daiphat.coreapi.application.dto.order;

import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.enums.order.PaymentGateway;
import lombok.Builder;

@Builder
public record PaymentResult(
        Long transactionId,
        TransactionType type,
        PaymentGateway gateway,
        Long gatewayOrderCode,
        String paymentRef,
        String checkoutUrl,
        String status
) {
}
