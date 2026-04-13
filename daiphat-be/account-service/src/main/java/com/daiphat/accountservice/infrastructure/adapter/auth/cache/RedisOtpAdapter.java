package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.auth.cache.OtpCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisOtpAdapter implements OtpCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveOtp(String email, String otp, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.otpCode(email), otp, duration);
    }

    @Override
    public Optional<String> getOtp(String email) {
        return redisClient.get(AuthCacheKeyGenerator.otpCode(email), String.class);
    }

    @Override
    public void deleteOtp(String email) {
        redisClient.delete(AuthCacheKeyGenerator.otpCode(email));
    }

    @Override
    public void incrementOtpAttempt(String email, Duration ttl) {
        redisClient.increment(AuthCacheKeyGenerator.otpAttempts(email), 1, ttl);
    }

    @Override
    public int getOtpAttemptCount(String email) {
        return redisClient.get(AuthCacheKeyGenerator.otpAttempts(email), Integer.class).orElse(0);
    }

    @Override
    public void resetOtpAttemptCount(String email) {
        redisClient.delete(AuthCacheKeyGenerator.otpAttempts(email));
    }
}
