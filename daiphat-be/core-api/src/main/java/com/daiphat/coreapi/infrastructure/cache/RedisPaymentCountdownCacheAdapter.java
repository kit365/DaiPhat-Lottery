package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.keys.OrderCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RedisPaymentCountdownCacheAdapter implements PaymentCountdownCachePort {

    private final RedisClient redisClient;

    @Override
    public void start(UUID orderId, Duration ttl) {
        redisClient.set(OrderCacheKeyGenerator.pendingPaymentCountdown(orderId), orderId.toString(), ttl);
    }

    @Override
    public Optional<Long> getRemainingSeconds(UUID orderId) {
        return redisClient.getTimeToLiveSeconds(OrderCacheKeyGenerator.pendingPaymentCountdown(orderId));
    }

    @Override
    public void clear(UUID orderId) {
        redisClient.delete(OrderCacheKeyGenerator.pendingPaymentCountdown(orderId));
    }
}
