package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.auth.PasswordResetCachePort;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.auth.ResetTokenData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisPasswordResetCacheAdapter implements PasswordResetCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveResetTokenData(String token, ResetTokenData data, Duration ttl) {
        redisClient.set(AuthCacheKeyGenerator.resetTokenData(token), data, ttl);
    }

    @Override
    public Optional<ResetTokenData> getResetTokenData(String token) {
        return redisClient.get(AuthCacheKeyGenerator.resetTokenData(token), ResetTokenData.class);
    }

    @Override
    public void deleteResetTokenData(String token) {
        redisClient.delete(AuthCacheKeyGenerator.resetTokenData(token));
    }
}
