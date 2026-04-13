package com.daiphat.accountservice.application.port.out.auth.cache;

import java.time.Duration;
import java.util.Optional;

public interface RateLimitCachePort {
    void incrementRateLimitAttempt(String actionType, String identifier, Duration duration);
    int getRateLimitAttemptCount(String actionType, String identifier);
    void resetRateLimit(String actionType, String identifier);
    
    void saveLastAttemptTime(String actionType, String identifier, long timestamp, Duration duration);
    Optional<Long> getLastAttemptTime(String actionType, String identifier);
}
