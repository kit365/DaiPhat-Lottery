package com.daiphat.accountservice.application.port.out.auth.cache;

import java.time.Duration;
import java.util.Optional;

public interface VerificationCachePort {
    void saveVerificationToken(String token, String email, Duration duration);
    Optional<String> getEmailByVerificationToken(String token);
    Optional<String> getOldTokenByEmail(String email);
    void deleteVerificationToken(String token);
}
