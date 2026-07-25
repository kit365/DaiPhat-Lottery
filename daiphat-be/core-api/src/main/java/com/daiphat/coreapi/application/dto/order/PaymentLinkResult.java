package com.daiphat.coreapi.application.dto.order;

public record PaymentLinkResult(
        Long gatewayOrderCode,
        String checkoutUrl,
        String qrCode,
        String accountNumber,
        String accountName,
        Long amount,
        String description,
        String bin,
        Long expiredAt
) {
    public PaymentLinkResult(Long gatewayOrderCode, String checkoutUrl) {
        this(gatewayOrderCode, checkoutUrl, null, null, null, null, null, null, null);
    }
}
