package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import com.daiphat.coreapi.application.port.out.order.PaymentLinkCachePort;
import com.daiphat.coreapi.application.port.out.order.keys.OrderCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisPaymentLinkCacheAdapter implements PaymentLinkCachePort {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(30);

    private final RedisClient redisClient;

    @Override
    public void put(Long gatewayOrderCode, PaymentLinkResult paymentLink, Duration ttl) {
        if (gatewayOrderCode == null || paymentLink == null) {
            return;
        }
        Duration effectiveTtl = ttl != null && !ttl.isNegative() && !ttl.isZero() ? ttl : DEFAULT_TTL;
        redisClient.set(
                OrderCacheKeyGenerator.paymentLink(gatewayOrderCode),
                CachedPaymentLinkPayload.from(paymentLink),
                effectiveTtl
        );
    }

    @Override
    public Optional<PaymentLinkResult> get(Long gatewayOrderCode) {
        if (gatewayOrderCode == null) {
            return Optional.empty();
        }
        return redisClient
                .get(OrderCacheKeyGenerator.paymentLink(gatewayOrderCode), CachedPaymentLinkPayload.class)
                .filter(CachedPaymentLinkPayload::hasQrCode)
                .map(CachedPaymentLinkPayload::toResult);
    }

    @Override
    public void clear(Long gatewayOrderCode) {
        if (gatewayOrderCode == null) {
            return;
        }
        redisClient.delete(OrderCacheKeyGenerator.paymentLink(gatewayOrderCode));
    }
}
