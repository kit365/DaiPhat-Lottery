package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.auth.VerificationCachePort;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisVerificationCacheAdapter implements VerificationCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveVerificationToken(String token, String email, Duration ttl) {
        getOldTokenByEmail(email).ifPresent(this::deleteVerificationToken);
        redisClient.set(AuthCacheKeyGenerator.verifyToken(token), email, ttl);
        redisClient.set(AuthCacheKeyGenerator.verifyEmail(email), token, ttl);
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
        getEmailByVerificationToken(token).ifPresent(email -> redisClient.delete(AuthCacheKeyGenerator.verifyEmail(email)));
        redisClient.delete(AuthCacheKeyGenerator.verifyToken(token));
    }
}
