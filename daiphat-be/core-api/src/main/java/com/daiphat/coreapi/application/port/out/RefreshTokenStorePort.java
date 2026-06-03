package com.daiphat.coreapi.application.port.out;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenStorePort {

    void save(UUID userId, String refreshToken, Duration ttl);

    Optional<String> find(UUID userId);

    void delete(UUID userId);
}
