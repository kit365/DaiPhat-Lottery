package com.smartlotto.accountservice.infrastructure.adapter.auth;

import com.smartlotto.accountservice.application.port.out.auth.AuthCachePort;
import com.smartlotto.accountservice.domain.model.auth.ResetTokenData;
import com.smartlotto.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.smartlotto.accountservice.infrastructure.persistence.cache.redis.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisAuthCacheAdapter implements AuthCachePort {

    private final RedisClient redisClient;

    //  Login/Token
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

    // Forgot Password
    @Override
    public void saveResetToken(String email, String resetToken, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.resetToken(email), resetToken, duration);
    }

    @Override
    public Optional<String> getResetToken(String email) {
        return redisClient.get(AuthCacheKeyGenerator.resetToken(email), String.class);
    }

    @Override
    public void deleteResetToken(String email) {
        redisClient.delete(AuthCacheKeyGenerator.resetToken(email));
    }

    @Override
    public void saveResetTokenData(String resetToken, ResetTokenData data, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.resetTokenData(resetToken), data, duration);
    }

    @Override
    public Optional<ResetTokenData> getResetTokenData(String resetToken) {
        return redisClient.get(AuthCacheKeyGenerator.resetTokenData(resetToken), ResetTokenData.class);
    }

    @Override
    public void incrementResetAttempt(String email) {
        String key = AuthCacheKeyGenerator.resetAttemptCount(email);
        int current = getResetAttemptCount(email);
        redisClient.set(key, current + 1, Duration.ofHours(24));
    }

    @Override
    public int getResetAttemptCount(String email) {
        return redisClient.get(AuthCacheKeyGenerator.resetAttemptCount(email), Integer.class).orElse(0);
    }

    @Override
    public void resetAttemptCount(String email) {
        redisClient.delete(AuthCacheKeyGenerator.resetAttemptCount(email));
    }

    // OTP/Verification
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

    // Account Lock
    @Override
    public void lockAccount(String email, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.accountLocked(email), "LOCKED", duration);
    }

    @Override
    public boolean isAccountLocked(String email) {
        return redisClient.exists(AuthCacheKeyGenerator.accountLocked(email));
    }

    @Override
    public void unlockAccount(String email) {
        redisClient.delete(AuthCacheKeyGenerator.accountLocked(email));
    }
}
