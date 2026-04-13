package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.AccountLockCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisAccountLockAdapter implements AccountLockCachePort {

    private static final String LOCK_VALUE = "LOCKED";
    private final RedisClient redisClient;

    @Override
    public void lockAccount(String username, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.accountLocked(username), LOCK_VALUE, duration);
    }

    @Override
    public boolean isAccountLocked(String username) {
        return redisClient.exists(AuthCacheKeyGenerator.accountLocked(username));
    }

    @Override
    public void unlockAccount(String username) {
        redisClient.delete(AuthCacheKeyGenerator.accountLocked(username));
    }

    @Override
    public int incrementLockAttempts(String username, Duration duration) {
        return (int) redisClient.increment(AuthCacheKeyGenerator.lockAttempts(username), 1, duration);
    }

    @Override
    public int getLockAttemptsCount(String username) {
        return redisClient.get(AuthCacheKeyGenerator.lockAttempts(username), Integer.class).orElse(0);
    }

    @Override
    public void resetLockAttempts(String username) {
        redisClient.delete(AuthCacheKeyGenerator.lockAttempts(username));
    }

    @Override
    public void saveLastFailedAttemptTime(String username, long timestamp, Duration duration) {
        // Updated to use true boundary key defined in AuthCacheKeyGenerator
        String key = AuthCacheKeyGenerator.accountLockLast(username);
        redisClient.set(key, timestamp, duration);
    }

    @Override
    public Optional<Long> getLastFailedAttemptTime(String username) {
        String key = AuthCacheKeyGenerator.accountLockLast(username);
        return redisClient.get(key, Long.class);
    }

    @Override
    public void resetLastFailedAttemptTime(String username) {
        String key = AuthCacheKeyGenerator.accountLockLast(username);
        redisClient.delete(key);
    }
}
