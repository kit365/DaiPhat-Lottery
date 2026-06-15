package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.order.PaymentAttemptCachePort;
import com.daiphat.coreapi.application.port.out.order.keys.OrderCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RedisPaymentAttemptCacheAdapter implements PaymentAttemptCachePort {

    private final RedisClient redisClient;

    @Override
    public long incrementFailureAttempt(Long transactionId, Duration ttl) {
        return redisClient.increment(OrderCacheKeyGenerator.paymentFailureAttempts(transactionId), 1, ttl);
    }

    @Override
    public void clearFailureAttempts(Long transactionId) {
        redisClient.delete(OrderCacheKeyGenerator.paymentFailureAttempts(transactionId));
    }
}
