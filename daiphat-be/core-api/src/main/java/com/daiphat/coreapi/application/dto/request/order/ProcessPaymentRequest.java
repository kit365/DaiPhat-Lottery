package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.TransactionType;

public record ProcessPaymentRequest(
        TransactionType type
) {
}
