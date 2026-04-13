package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.cache.RateLimitCachePort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class RateLimiterService implements RateLimiterPort {
    private static final String LOG_PREFIX_STANDARD = "RateLimit:";
    private static final String LOG_PREFIX_BURST = "RateLimit Burst:";
    private final RateLimitCachePort rateLimitCachePort;
    private final AuthProperties authProperties;

    @Override
    public boolean checkAndRecord(String identifier, AuthAction action) {
        var ctx = getContext(identifier, action);

        if (ctx.isThrottled()) {
            return failThrottled(LOG_PREFIX_STANDARD, ctx, ctx.remainingTime());
        }

        recordAttempt(ctx, authProperties.getLockout().getFailureWindow());
        return true;
    }

    @Override
    public boolean checkAndRecordFixed(String identifier, AuthAction action, int maxAttempts, long windowSeconds) {
        var ctx = getContext(identifier, action);
        int currentAttempts = ctx.attempts();

        if (ctx.elapsedSeconds() >= windowSeconds) {
            rateLimitCachePort.resetRateLimit(ctx.actionType(), identifier);
            currentAttempts = 0;
        }

        if (currentAttempts >= maxAttempts) {
            return failThrottled(LOG_PREFIX_BURST, ctx, windowSeconds - ctx.elapsedSeconds());
        }

        recordAttempt(ctx, Duration.ofSeconds(windowSeconds));
        return true;
    }

    @Override
    public long getRemainingWaitTime(String identifier, AuthAction action) {
        return getContext(identifier, action).remainingTime();
    }

    @Override
    public long getRemainingWaitTimeFixed(String identifier, AuthAction action, long windowSeconds) {
        var ctx = getContext(identifier, action);
        return Math.max(0, windowSeconds - ctx.elapsedSeconds());
    }

    @Override
    public void resetRateLimit(String identifier, AuthAction action) {
        rateLimitCachePort.resetRateLimit(action.getCode(), identifier);
    }


    private RateLimitContext getContext(String identifier, AuthAction action) {
        String actionType = action.getCode();
        long lastAttemptAt = rateLimitCachePort.getLastAttemptTime(actionType, identifier).orElse(0L);
        int attempts = rateLimitCachePort.getRateLimitAttemptCount(actionType, identifier);

        long elapsed = (System.currentTimeMillis() - lastAttemptAt) / 1000;
        long waitTime = AuthUtils.calculateWaitTime(
                attempts,
                authProperties.getLockout().getBackoffSeconds(),
                authProperties.getLockout().getMaxDuration().getSeconds()
        );

        return new RateLimitContext(identifier, actionType, attempts, elapsed, waitTime);
    }

    private boolean failThrottled(String prefix, RateLimitContext ctx, long remaining) {
        log.warn("{} Action '{}' throttled for {} for another {}s", prefix, ctx.actionType(), ctx.identifier(), remaining);
        return false;
    }

    private void recordAttempt(RateLimitContext ctx, Duration window) {
        long currentTime = System.currentTimeMillis();
        rateLimitCachePort.saveLastAttemptTime(ctx.actionType(), ctx.identifier(), currentTime, window);
        rateLimitCachePort.incrementRateLimitAttempt(ctx.actionType(), ctx.identifier(), window);
        log.debug("RateLimit: Recorded attempt for '{}' by identifier '{}'", ctx.actionType(), ctx.identifier());
    }

    private record RateLimitContext(
            String identifier,
            String actionType,
            int attempts,
            long elapsedSeconds,
            long waitTimeSeconds
    ) {
        boolean isThrottled() {
            return elapsedSeconds < waitTimeSeconds;
        }

        long remainingTime() {
            return Math.max(0, waitTimeSeconds - elapsedSeconds);
        }
    }

}


