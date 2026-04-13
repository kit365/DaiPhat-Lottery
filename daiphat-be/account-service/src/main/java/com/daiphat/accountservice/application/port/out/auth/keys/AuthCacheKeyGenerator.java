package com.daiphat.accountservice.application.port.out.auth.keys;

public class AuthCacheKeyGenerator {
    private static final String AUTH_PREFIX = "auth";
    private static final String TOKEN_PREFIX = AUTH_PREFIX + ":token";
    private static final String FORGOT_PREFIX = AUTH_PREFIX + ":forgot";
    private static final String OTP_PREFIX = AUTH_PREFIX + ":otp";
    private static final String LOCK_PREFIX = AUTH_PREFIX + ":lock";
    private static final String VERIFY_PREFIX = AUTH_PREFIX + ":verify";

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
    public static String resetTokenData(String resetToken) {
        return FORGOT_PREFIX + ":data:" + resetToken;
    }

    public static String mailLock(String email) {
        return LOCK_PREFIX + ":mail:" + email;
    }

    public static String loginLock(String username) {
        return LOCK_PREFIX + ":login:" + username;
    }

    public static String registerLock(String email) {
        return LOCK_PREFIX + ":register:" + email;
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

    public static String accountLockLast(String username) {
        return LOCK_PREFIX + ":last:" + username;
    }

    // Verify Email Keys
    public static String verifyToken(String token) {
        return VERIFY_PREFIX + ":token:" + token;
    }

    public static String verifyEmail(String email) {
        return VERIFY_PREFIX + ":email:" + email;
    }

    // Rate Limit Keys
    public static String rateLimitCount(String action, String identifier) {
        return AUTH_PREFIX + ":rate:" + action + ":count:" + identifier;
    }

    public static String rateLimitLast(String action, String identifier) {
        return AUTH_PREFIX + ":rate:" + action + ":last:" + identifier;
    }
}
