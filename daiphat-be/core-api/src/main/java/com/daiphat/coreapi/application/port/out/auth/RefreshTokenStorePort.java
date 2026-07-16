package com.daiphat.coreapi.application.port.out.auth;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenStorePort {

    void save(UUID userId, String refreshToken, Duration ttl);

    Optional<String> find(UUID userId);

    boolean rotate(UUID userId, String currentRefreshToken, String newRefreshToken, Duration ttl);

    void delete(UUID userId);
}
