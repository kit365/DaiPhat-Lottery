package com.daiphat.coreapi.application.dto.order;

public record GatewayCallbackResult(
        boolean success,
        Long gatewayOrderCode,
        String paymentRef,
        String message,
        String gatewayResponseCode,
        String rawPayload
) {
}
