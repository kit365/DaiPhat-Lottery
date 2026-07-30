package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;

import java.time.Duration;
import java.util.Optional;

/**
 * Caches PayOS create-link payload (incl. qrCode) so continue-payment can reuse QR.
 * PayOS GET payment-link API does not return qrCode.
 */
public interface PaymentLinkCachePort {

    void put(Long gatewayOrderCode, PaymentLinkResult paymentLink, Duration ttl);

    Optional<PaymentLinkResult> get(Long gatewayOrderCode);

    void clear(Long gatewayOrderCode);
}
