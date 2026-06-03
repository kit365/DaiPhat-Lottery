package com.daiphat.coreapi.application.port.out.auth;

import java.time.Duration;
import java.util.Optional;

public interface VerificationCachePort {
    void saveVerificationToken(String token, String email, Duration ttl);

    Optional<String> getEmailByVerificationToken(String token);

    Optional<String> getOldTokenByEmail(String email);

    void deleteVerificationToken(String token);
}
