package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.RateLimitCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisRateLimitAdapter implements RateLimitCachePort {

    private final RedisClient redisClient;

    @Override
    public void incrementRateLimitAttempt(String actionType, String identifier, Duration duration) {
        redisClient.increment(AuthCacheKeyGenerator.rateLimitCount(actionType, identifier), 1, duration);
    }

    @Override
    public int getRateLimitAttemptCount(String actionType, String identifier) {
        return redisClient.get(AuthCacheKeyGenerator.rateLimitCount(actionType, identifier), Integer.class).orElse(0);
    }

    @Override
    public void resetRateLimit(String actionType, String identifier) {
        redisClient.delete(AuthCacheKeyGenerator.rateLimitCount(actionType, identifier));
        redisClient.delete(AuthCacheKeyGenerator.rateLimitLast(actionType, identifier));
    }

    @Override
    public void saveLastAttemptTime(String actionType, String identifier, long timestamp, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.rateLimitLast(actionType, identifier), timestamp, duration);
    }

    @Override
    public Optional<Long> getLastAttemptTime(String actionType, String identifier) {
        return redisClient.get(AuthCacheKeyGenerator.rateLimitLast(actionType, identifier), Long.class);
    }
}
