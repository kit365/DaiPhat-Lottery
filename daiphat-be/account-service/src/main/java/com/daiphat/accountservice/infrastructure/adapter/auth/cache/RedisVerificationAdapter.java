package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.VerificationCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisVerificationAdapter implements VerificationCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveVerificationToken(String token, String email, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.verifyToken(token), email, duration);
        redisClient.set(AuthCacheKeyGenerator.verifyEmail(email), token, duration);
    }

    @Override
    public Optional<String> getEmailByVerificationToken(String token) {
        return redisClient.get(AuthCacheKeyGenerator.verifyToken(token), String.class);
    }

    @Override
    public Optional<String> getOldTokenByEmail(String email) {
        return redisClient.get(AuthCacheKeyGenerator.verifyEmail(email), String.class);
    }

    @Override
    public void deleteVerificationToken(String token) {
        getEmailByVerificationToken(token).ifPresent(email -> 
            redisClient.delete(AuthCacheKeyGenerator.verifyEmail(email))
        );
        redisClient.delete(AuthCacheKeyGenerator.verifyToken(token));
    }
}
