package com.daiphat.accountservice.application.port.out.auth.cache;

import java.time.Duration;
import java.util.Optional;

public interface TokenCachePort {
    void saveToken(String userId, String token, Duration duration);
    Optional<String> getToken(String userId);
    void revokeToken(String userId);
    boolean isTokenValid(String userId);
    void saveRefreshToken(String userId, String token, Duration duration);
    Optional<String> getRefreshToken(String userId);
}
