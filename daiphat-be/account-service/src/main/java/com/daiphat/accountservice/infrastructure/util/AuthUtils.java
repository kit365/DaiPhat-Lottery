package com.daiphat.accountservice.infrastructure.util;

import java.security.SecureRandom;


public final class AuthUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long[] BACKOFF_SECONDS = {60, 120, 300, 600}; // 1m, 2m, 5m, 10m

    private AuthUtils() {
        // Private constructor to prevent instantiation
    }


    public static String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1000000));
    }


    public static long calculateWaitTime(int resendCount) {
        return BACKOFF_SECONDS[Math.min(resendCount, BACKOFF_SECONDS.length - 1)];
    }
}
