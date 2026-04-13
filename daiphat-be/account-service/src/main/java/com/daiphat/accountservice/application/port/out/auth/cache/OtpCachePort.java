package com.daiphat.accountservice.application.port.out.auth.cache;

import java.time.Duration;
import java.util.Optional;

public interface OtpCachePort {
    void saveOtp(String email, String otp, Duration duration);
    Optional<String> getOtp(String email);
    void deleteOtp(String email);
    
    void incrementOtpAttempt(String email, Duration ttl);
    int getOtpAttemptCount(String email);
    void resetOtpAttemptCount(String email);
}
