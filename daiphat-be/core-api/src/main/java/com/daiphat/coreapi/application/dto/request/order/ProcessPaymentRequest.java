package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotNull;

public record ProcessPaymentRequest(
        @Positive Long transactionId,
        @NotNull PaymentGateway gateway
) {
}
