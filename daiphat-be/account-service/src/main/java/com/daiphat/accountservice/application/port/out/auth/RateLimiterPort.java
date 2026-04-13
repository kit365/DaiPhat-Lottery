package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;

/**
 * Port định nghĩa các hành vi kiểm soát tốc độ yêu cầu (Rate Limiting).
 * Đảm bảo pháo đài không bị ngập lụt bởi các đợt spam request.
 */
public interface RateLimiterPort {

    /**
     * Kiểm tra và ghi nhận một nỗ lực hành động dựa trên backoff strategy.
     * @return true nếu được phép thực hiện, false nếu bị giới hạn.
     */
    boolean checkAndRecord(String identifier, AuthAction action);

    /**
     * Chặn spam theo cơ chế Burst: Cho phép maxAttempts trong windowSeconds.
     * @return true nếu được phép thực hiện, false nếu bị giới hạn.
     */
    boolean checkAndRecordFixed(String identifier, AuthAction action, int maxAttempts, long windowSeconds);

    /**
     * Lấy thời gian chờ còn lại.
     */
    long getRemainingWaitTime(String identifier, AuthAction action);
 
    /**
     * Lấy thời gian chờ còn lại cho cơ chế Fixed Window (Burst).
     */
    long getRemainingWaitTimeFixed(String identifier, AuthAction action, long windowSeconds);

    /**
     * Làm sạch bộ đếm rate limit.
     */
    void resetRateLimit(String identifier, AuthAction action);
}
