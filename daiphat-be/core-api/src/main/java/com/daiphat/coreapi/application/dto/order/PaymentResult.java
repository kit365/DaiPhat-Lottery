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
        String status,
        String qrCode,
        String accountNumber,
        String accountName,
        Long amount,
        String description,
        String bin,
        Long expiredAt
) {
    /** Compatibility constructor for COD / legacy callers. */
    public PaymentResult(
            Long transactionId,
            TransactionType type,
            PaymentGateway gateway,
            Long gatewayOrderCode,
            String paymentRef,
            String checkoutUrl,
            String status
    ) {
        this(
                transactionId,
                type,
                gateway,
                gatewayOrderCode,
                paymentRef,
                checkoutUrl,
                status,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
