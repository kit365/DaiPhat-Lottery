package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.DistributedLockPort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Hiện thực hóa DistributedLockPort bằng Redis thông qua RedisClient.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RedisDistributedLockAdapter implements DistributedLockPort {

    private final RedisClient redisClient;
    private static final String LOCK_VALUE = "LOCKED";

    @Override
    public boolean tryLock(String key, Duration timeout) {
        log.debug("Attempting to acquire distributed lock via Redis: {} (TTL: {}s)", key, timeout.toSeconds());
        boolean success = redisClient.setIfAbsent(key, LOCK_VALUE, timeout);
        
        if (success) {
            log.trace("Lock acquired via Redis: {}", key);
        } else {
            log.warn("Lock acquisition failed via Redis: {}. Resource is busy.", key);
        }
        
        return success;
    }

    @Override
    public void unlock(String key) {
        log.debug("Releasing distributed lock via Redis: {}", key);
        redisClient.delete(key);
    }
}
