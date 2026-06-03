package com.daiphat.coreapi.application.port.out.auth;

import java.time.Duration;
import java.util.Optional;

public interface OtpCachePort {
    void saveOtp(String email, String otp, Duration ttl);

    Optional<String> getOtp(String email);

    void deleteOtp(String email);

    int getOtpAttemptCount(String email);

    void incrementOtpAttempt(String email, Duration ttl);

    void resetOtpAttemptCount(String email);
}
