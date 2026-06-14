package com.daiphat.coreapi.application.dto.order;

public record PaymentLinkResult(
        Long gatewayOrderCode,
        String checkoutUrl
) {
}
