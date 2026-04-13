package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.port.out.auth.LoginAttemptPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.application.port.out.auth.cache.AccountLockCachePort;
import com.daiphat.accountservice.application.port.out.auth.DistributedLockPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
import com.daiphat.accountservice.application.port.in.UserServicePort;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.response.LoginLockoutResponse;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

@Service
@Slf4j
public class LoginAttemptService implements LoginAttemptPort {

    private final AccountLockCachePort accountLockCachePort;
    private final AuthProperties authProperties;
    private final DistributedLockPort lockManager;
    private final UserRepositoryPort userRepositoryPort;
    private final UserServicePort userService;
    private final RateLimiterPort rateLimiterService;
    private final TransactionTemplate requiresNewTransactionTemplate;

    public LoginAttemptService(
            AccountLockCachePort accountLockCachePort,
            AuthProperties authProperties,
            DistributedLockPort lockManager,
            UserRepositoryPort userRepositoryPort,
            UserServicePort userService,
            RateLimiterPort rateLimiterService,
            PlatformTransactionManager transactionManager) {
        this.accountLockCachePort = accountLockCachePort;
        this.authProperties = authProperties;
        this.lockManager = lockManager;
        this.userRepositoryPort = userRepositoryPort;
        this.userService = userService;
        this.rateLimiterService = rateLimiterService;
        this.requiresNewTransactionTemplate = new TransactionTemplate(transactionManager);
        this.requiresNewTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Ghi nhận một lần đăng nhập thất bại.
     * Sử dụng cơ chế Exponential Backoff để tính toán thời gian khóa.
     */
    @Override
    public void recordFailedAttempt(String username) {
        int failures = accountLockCachePort.incrementLockAttempts(username, authProperties.getLockout().getFailureWindow());
        Duration maxDuration = authProperties.getLockout().getMaxDuration();
        long waitTime = calculateLockoutTime(failures, maxDuration);

        // Lưu vết thời điểm thất bại cuối cùng để tính toán thời gian mở khóa
        accountLockCachePort.saveLastFailedAttemptTime(username, System.currentTimeMillis(), maxDuration);

        // Đồng bộ hóa trạng thái thất bại vào Database (Sync on every failure)
        syncFailedAttemptToDb(username, failures, waitTime);

        // Ghi log cảnh báo bảo mật nếu đạt ngưỡng
        logLockoutAlert(username, failures, waitTime);
    }

    private long calculateLockoutTime(int failures, Duration maxDuration) {
        long maxWait = maxDuration.toSeconds();
        int threshold = authProperties.getLockout().getFailureThreshold();
        return AuthUtils.calculateLockoutTime(failures, threshold, authProperties.getLockout().getBackoffSeconds(), maxWait);
    }

    private void syncFailedAttemptToDb(String username, int failures, long waitTime) {
        requiresNewTransactionTemplate.execute(status -> {
            userRepositoryPort.findByUsername(username).ifPresent(user -> {
                user.recordFailedLogin();
                
                // Chỉ thực hiện lệnh khóa khi số lần sai đạt đúng mốc (5, 10, 15...)
                if (failures % authProperties.getLockout().getFailureThreshold() == 0) {
                    accountLockCachePort.lockAccount(username, Duration.ofSeconds(waitTime));
                    user.lockAccount(waitTime);
                    log.warn("Security: Humanity Lock triggered for user {} at attempt {} until {}", 
                        username, failures, user.getLockedUntil());
                }
                
                userRepositoryPort.save(user);
                log.debug("Security: DB counter synchronized for user {}: {} attempts", username, user.getFailedLoginAttempts());
            });
            return null;
        });
    }

    private void logLockoutAlert(String username, int failures, long waitTime) {
        if (failures >= authProperties.getLockout().getFailureThreshold()) {
            log.warn("Security: Account {} locked for {} seconds after {} failed attempts", 
                username, waitTime, failures);
        }
    }

    /**
     * Ghi nhận đăng nhập thành công.
     * Giải phóng các lệnh khóa và xóa bộ đếm thất bại.
     */
    @Override
    public void recordSuccessfulAttempt(String username) {
        resetCacheState(username);

        rateLimiterService.resetRateLimit(username, AuthAction.LOGIN);

        resetDbState(username);

        log.debug("Security: Login attempts and lockout state reset for user {}", username);
    }

    private void resetCacheState(String username) {
        accountLockCachePort.resetLockAttempts(username);
        accountLockCachePort.resetLastFailedAttemptTime(username);
        accountLockCachePort.unlockAccount(username);
    }

    private void resetDbState(String username) {
        requiresNewTransactionTemplate.execute(status -> {
            userRepositoryPort.findByUsername(username).ifPresent(user -> {
                boolean changed = false;
                if (user.getFailedLoginAttempts() > 0) {
                    user.setFailedLoginAttempts(0);
                    changed = true;
                }
                if (user.getStatus() == UserStatus.LOCKED || user.getLockedUntil() != null) {
                    user.unlockAccount();
                    changed = true;
                    log.info("Security: Account {} successfully unlocked in DB after successful login", username);
                }
                if (changed) {
                    userRepositoryPort.save(user);
                }
            });
            return null;
        });
    }

    /**
     * Tính toán thời gian còn lại trước khi tài khoản được mở khóa.
     * @return Số giây còn lại, hoặc 0 nếu không bị khóa.
     */
    @Override
    public long getRemainingLockTime(String username) {
        int failures = accountLockCachePort.getLockAttemptsCount(username);
        int threshold = authProperties.getLockout().getFailureThreshold();

        // 1. Check Redis for Step-based lockout (Fast Path)
        int lastLockTriggerFailure = (failures / threshold) * threshold;
        Optional<Long> lastAttemptAtOpt = accountLockCachePort.getLastFailedAttemptTime(username);
        
        if (lastLockTriggerFailure > 0 && lastAttemptAtOpt.isPresent()) {
            long lastAttemptAt = lastAttemptAtOpt.get();
            long maxWait = authProperties.getLockout().getMaxDuration().toSeconds();
            long waitTime = AuthUtils.calculateLockoutTime(lastLockTriggerFailure, threshold, authProperties.getLockout().getBackoffSeconds(), maxWait);
            
            if (waitTime > 0) {
                long elapsed = (System.currentTimeMillis() - lastAttemptAt) / 1000;
                long remaining = waitTime - elapsed;
                if (remaining > 0) return remaining;
            }
        }

        // 2. Fallback to DB if Redis is empty or doesn't have the last attempt time
        return userRepositoryPort.findByUsername(username)
                .map(user -> {
                    if (user.getLockedUntil() != null) {
                        long rem = Duration.between(java.time.LocalDateTime.now(), user.getLockedUntil()).toSeconds();
                        return Math.max(0L, rem);
                    }
                    return 0L;
                }).orElse(0L);
    }

    /**
     * Thực thi một hành động đăng nhập và tự động ghi nhận thành công/thất bại.
     */
    @Override
    public <T> T executeWithTracking(String username, Supplier<T> authenticationAction) {
        try {
            T result = authenticationAction.get();
            this.recordSuccessfulAttempt(username);
            return result;
        } catch (DomainException e) {
            this.recordFailedAttempt(username);
            throw e;
        }
    }

    /**
     * 1. Kiểm tra trạng thái khóa tài khoản.
     * 2. Chiếm quyền khóa phân tán (Distributed Lock) để chống Concurrency.
     * 3. Thực thi nghiệp vụ và tự động ghi nhận thành công/thất bại.
     */
    @Override
    public <T> T executeSecurely(String username, Supplier<T> action) {
        // 1. Kiểm tra trạng thái khóa tài khoản ngay lập tức
        this.verifyAccountNotLocked(username);

        // 2. Chiếm dụng Lock phân tán
        String lockKey = AuthCacheKeyGenerator.loginLock(username);
        if (!lockManager.tryLock(lockKey, authProperties.getLockout().getLockTimeout())) {
            long retryAfter = authProperties.getLockout().getLockTimeout().toSeconds();
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        try {
            // 3. Thực thi nghiệp vụ với cơ chế Tracking tự động
            return this.executeWithTracking(username, action);
        } finally {
            // 4. Giải phóng Lock
            lockManager.unlock(lockKey);
        }
    }

    private void verifyAccountNotLocked(String username) {
        // 1. Check Redis (Fast Path - temporary lockout)
        checkTemporaryLockout(username);

        // 2. Check DB (Slow Path - persistent lockout and status checks)
        checkPersistentLockout(username);
    }

    private void checkTemporaryLockout(String username) {
        if (accountLockCachePort.isAccountLocked(username)) {
            throwLockoutException(username, null);
        }
    }

    private void checkPersistentLockout(String username) {
        // Tái sử dụng logic thẩm định trung tâm từ UserService
        UserModel user = userService.fetchActiveUserByUsername(username);
        
        if (user.isAccountLocked()) {
            long remainingSeconds = Duration.between(java.time.LocalDateTime.now(), user.getLockedUntil()).toSeconds();
            if (remainingSeconds > 0) {
                // Re-sync to Redis for fast path consistency and throw with DB time
                accountLockCachePort.lockAccount(username, Duration.ofSeconds(remainingSeconds));
                throwLockoutException(username, remainingSeconds);
            }
        }
    }

    private void throwLockoutException(String username, Long preCalculatedRemaining) {
        // Ưu tiên dùng số giây đã tính từ DB trước (nếu có), nếu không mới tính toán lại
        long remaining = (preCalculatedRemaining != null && preCalculatedRemaining > 0) 
                ? preCalculatedRemaining 
                : this.getRemainingLockTime(username);
        
        if (remaining <= 0) {
            remaining = 1; // Last resort safeguard (chỉ khi cả DB và Redis đều hụt)
        }
        throw new DomainException(ErrorCode.USER_LOCKED, new LoginLockoutResponse(remaining), remaining);
    }
}
