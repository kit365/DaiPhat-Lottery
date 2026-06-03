package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.RefreshTokenStorePort;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RedisRefreshTokenStoreAdapter implements RefreshTokenStorePort {

    private final RedisClient redisClient;

    @Override
    public void save(UUID userId, String refreshToken, Duration ttl) {
        redisClient.set(AuthCacheKeyGenerator.refreshToken(userId.toString()), refreshToken, ttl);
    }

    @Override
    public Optional<String> find(UUID userId) {
        return redisClient.get(AuthCacheKeyGenerator.refreshToken(userId.toString()), String.class);
    }

    @Override
    public void delete(UUID userId) {
        redisClient.delete(AuthCacheKeyGenerator.refreshToken(userId.toString()));
    }
}
