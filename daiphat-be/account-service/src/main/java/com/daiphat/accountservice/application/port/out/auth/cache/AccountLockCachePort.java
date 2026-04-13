package com.daiphat.accountservice.application.port.out.auth.cache;

import java.time.Duration;
import java.util.Optional;

public interface AccountLockCachePort {
    void lockAccount(String username, Duration duration);
    boolean isAccountLocked(String username);
    void unlockAccount(String username);
    
    int incrementLockAttempts(String username, Duration duration);
    int getLockAttemptsCount(String username);
    void resetLockAttempts(String username);
    
    void saveLastFailedAttemptTime(String username, long timestamp, Duration duration);
    Optional<Long> getLastFailedAttemptTime(String username);
    void resetLastFailedAttemptTime(String username);
}
