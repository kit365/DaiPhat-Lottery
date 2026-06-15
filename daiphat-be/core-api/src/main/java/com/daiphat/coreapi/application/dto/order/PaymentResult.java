package com.daiphat.coreapi.application.dto.order;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
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
