package com.daiphat.coreapi.application.port.out.auth;

import com.daiphat.coreapi.domain.model.auth.ResetTokenData;

import java.time.Duration;
import java.util.Optional;

public interface PasswordResetCachePort {
    void saveResetTokenData(String token, ResetTokenData data, Duration ttl);

    Optional<ResetTokenData> getResetTokenData(String token);

    void deleteResetTokenData(String token);
}
