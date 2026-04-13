package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.PasswordResetCachePort;
import com.daiphat.accountservice.domain.model.auth.ResetTokenData;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisPasswordResetAdapter implements PasswordResetCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveResetTokenData(String resetToken, ResetTokenData data, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.resetTokenData(resetToken), data, duration);
    }

    @Override
    public Optional<ResetTokenData> getResetTokenData(String resetToken) {
        return redisClient.get(AuthCacheKeyGenerator.resetTokenData(resetToken), ResetTokenData.class);
    }

    @Override
    public void deleteResetTokenData(String resetToken) {
        redisClient.delete(AuthCacheKeyGenerator.resetTokenData(resetToken));
    }
}
