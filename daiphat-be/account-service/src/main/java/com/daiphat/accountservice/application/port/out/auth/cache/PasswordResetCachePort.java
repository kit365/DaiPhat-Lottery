package com.daiphat.accountservice.application.port.out.auth.cache;

import com.daiphat.accountservice.domain.model.auth.ResetTokenData;

import java.time.Duration;
import java.util.Optional;

public interface PasswordResetCachePort {
    void saveResetTokenData(String resetToken, ResetTokenData data, Duration duration);
    Optional<ResetTokenData> getResetTokenData(String resetToken);
    void deleteResetTokenData(String resetToken);
}
