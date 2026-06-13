package com.daiphat.coreapi.application.dto.order;

import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import lombok.Builder;

@Builder
public record PaymentResult(
        TransactionType type,
        String paymentRef,
        String checkoutUrl,
        String status
) {
}
