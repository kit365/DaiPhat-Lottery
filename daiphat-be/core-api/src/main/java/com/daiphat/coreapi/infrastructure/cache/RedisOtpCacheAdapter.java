package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.auth.OtpCachePort;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisOtpCacheAdapter implements OtpCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveOtp(String email, String otp, Duration ttl) {
        redisClient.set(AuthCacheKeyGenerator.otpCode(email), otp, ttl);
        resetOtpAttemptCount(email);
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
    public int getOtpAttemptCount(String email) {
        return redisClient.get(AuthCacheKeyGenerator.otpAttempts(email), Integer.class).orElse(0);
    }

    @Override
    public void incrementOtpAttempt(String email, Duration ttl) {
        redisClient.increment(AuthCacheKeyGenerator.otpAttempts(email), 1, ttl);
    }

    @Override
    public void resetOtpAttemptCount(String email) {
        redisClient.delete(AuthCacheKeyGenerator.otpAttempts(email));
    }
}
