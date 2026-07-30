package com.daiphat.coreapi.application.port.out.order.keys;

import java.util.UUID;

public final class OrderCacheKeyGenerator {

    private OrderCacheKeyGenerator() {
    }

    public static String pendingPaymentCountdown(UUID orderId) {
        return "order:pending-payment:" + orderId;
    }

    public static String paymentFailureAttempts(Long transactionId) {
        return "order:payment-attempts:" + transactionId;
    }

    public static String paymentLink(Long gatewayOrderCode) {
        return "order:payos-link:" + gatewayOrderCode;
    }
}

