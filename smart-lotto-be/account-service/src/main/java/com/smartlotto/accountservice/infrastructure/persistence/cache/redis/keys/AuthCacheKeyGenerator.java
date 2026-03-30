package com.smartlotto.accountservice.infrastructure.persistence.cache.redis.keys;

public class AuthCacheKeyGenerator {
    private static final String AUTH_PREFIX = "auth";
    private static final String TOKEN_PREFIX = AUTH_PREFIX + ":token";
    private static final String FORGOT_PREFIX = AUTH_PREFIX + ":forgot";
    private static final String OTP_PREFIX = AUTH_PREFIX + ":otp";
    private static final String LOCK_PREFIX = AUTH_PREFIX + ":lock";

    // Token Keys
    public static String accessToken(String userId) {
        return TOKEN_PREFIX + ":" + userId;
    }

    public static String refreshToken(String userId) {
        return TOKEN_PREFIX + ":refresh:" + userId;
    }

    public static String blacklistedToken(String token) {
        return TOKEN_PREFIX + ":blacklist:" + token;
    }

    // Forgot Password Keys
    public static String resetToken(String email) {
        return FORGOT_PREFIX + ":token:" + email;
    }

    public static String resetTokenData(String resetToken) {
        return FORGOT_PREFIX + ":data:" + resetToken;
    }

    public static String resetAttemptCount(String email) {
        return FORGOT_PREFIX + ":attempts:" + email;
    }

    public static String resetVerificationCode(String email) {
        return FORGOT_PREFIX + ":code:" + email;
    }

    // OTP Keys
    public static String otpCode(String email) {
        return OTP_PREFIX + ":" + email;
    }

    public static String otpAttempts(String email) {
        return OTP_PREFIX + ":attempts:" + email;
    }

    // Account Lock Keys
    public static String accountLocked(String email) {
        return LOCK_PREFIX + ":" + email;
    }

    public static String lockAttempts(String email) {
        return LOCK_PREFIX + ":attempts:" + email;
    }

}
