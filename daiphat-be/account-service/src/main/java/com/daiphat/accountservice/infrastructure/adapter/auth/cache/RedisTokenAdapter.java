package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.TokenCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisTokenAdapter implements TokenCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveToken(String userId, String token, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.accessToken(userId), token, duration);
    }

    @Override
    public Optional<String> getToken(String userId) {
        return redisClient.get(AuthCacheKeyGenerator.accessToken(userId), String.class);
    }

    @Override
    public void revokeToken(String userId) {
        redisClient.delete(AuthCacheKeyGenerator.accessToken(userId));
        redisClient.delete(AuthCacheKeyGenerator.refreshToken(userId));
    }

    @Override
    public boolean isTokenValid(String userId) {
        return redisClient.exists(AuthCacheKeyGenerator.accessToken(userId));
    }

    @Override
    public void saveRefreshToken(String userId, String token, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.refreshToken(userId), token, duration);
    }

    @Override
    public Optional<String> getRefreshToken(String userId) {
        return redisClient.get(AuthCacheKeyGenerator.refreshToken(userId), String.class);
    }
}
