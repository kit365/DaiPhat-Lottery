package com.daiphat.accountservice.infrastructure.util;

import java.security.SecureRandom;


public final class AuthUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private AuthUtils() {
        // Private constructor to prevent instantiation
    }

    public static String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1000000));
    }

    public static long calculateWaitTime(int resendCount, long[] backoffConfig, long maxWaitTimeSeconds) {
        // Optimized for UX: First attempt (count=0) AND first resend (count=1) are immediate (0s wait).
        if (resendCount <= 1) {
            return 0;
        }
        if (backoffConfig == null || backoffConfig.length == 0) {
            return 60; // Default fallback
        }
        // Use resendCount - 2 as index so that the 2nd resend (count=2) uses backoffConfig[0]
        long waitTime = backoffConfig[Math.min(resendCount - 2, backoffConfig.length - 1)];
        return Math.min(waitTime, maxWaitTimeSeconds);
    }

    /**
     * Tính toán thời gian khóa dựa trên số lần thất bại và ngưỡng (threshold).
     * @return Thời gian khóa (giây), trả về 0 nếu chưa vượt ngưỡng.
     */
    public static long calculateLockoutTime(int currentFailures, int threshold, long[] backoffConfig, long maxWaitSeconds) {
        // Chỉ kích hoạt lệnh khóa khi số lần sai đạt đúng mốc bội số của threshold (5, 10, 15...)
        if (currentFailures <= 0 || currentFailures % threshold != 0) {
            return 0;
        }

        // Tính toán bậc thang (step): 5 sai -> step 0, 10 sai -> step 1...
        int lockStep = (currentFailures / threshold);
        
        // Fix audit: ensure step maps correctly to the backoff lookup
        return calculateWaitTime(lockStep, backoffConfig, maxWaitSeconds);
    }

    public static boolean isValidEmail(String email) {
        if (email == null) {
            return false;
        }
        String emailRegex = "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$";
        return email.matches(emailRegex);
    }

    public static boolean isValidPhone(String phone) {
        if (phone == null) {
            return false;
        }
        String phoneRegex = "^[0-9]{10,11}$";
        return phone.matches(phoneRegex);
    }

    public static boolean isValidUsername(String username) {
        if (username == null) {
            return false;
        }
        // 3-20 chars, alphanumeric or underscores
        String usernameRegex = "^[a-zA-Z0-9_]{3,20}$";
        return username.matches(usernameRegex);
    }

    public static boolean isValidPassword(String password) {
        if (password == null) {
            return false;
        }
        // Min 8, max 32, at least 1 upper, 1 lower, 1 digit, 1 special
        String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,32}$";
        return password.matches(passwordRegex);
    }

    public static boolean isWithinLength(String text, int max) {
        if (text == null) {
            return true;
        }
        return text.length() <= max;
    }

    public static String maskToken(String token) {
        if (token == null) {
            return "null";
        }
        if (token.length() <= 8) {
            return "****";
        }
        return token.substring(0, 4) + "...." + token.substring(token.length() - 4);
    }
}
