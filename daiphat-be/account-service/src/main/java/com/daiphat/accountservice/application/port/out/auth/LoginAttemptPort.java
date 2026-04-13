package com.daiphat.accountservice.application.port.out.auth;

import java.util.function.Supplier;

/**
 * Port định nghĩa các hành vi ghi nhận và xử lý nỗ lực đăng nhập.
 * Đảm bảo các quy tắc về brute-force và lockout được thực thi đàng hoàng.
 */
public interface LoginAttemptPort {

    /**
     * Ghi nhận một lần đăng nhập thất bại và tính toán thời gian khóa.
     */
    void recordFailedAttempt(String username);

    /**
     * Ghi nhận đăng nhập thành công và giải phóng các lệnh khóa.
     */
    void recordSuccessfulAttempt(String username);

    /**
     * Lấy thời gian còn lại trước khi tài khoản được mở khóa.
     */
    long getRemainingLockTime(String username);

    /**
     * Thực thi một hành động đăng nhập và tự động ghi nhận thành công/thất bại.
     */
    <T> T executeWithTracking(String username, Supplier<T> authenticationAction);

    /**
     * Thực thi nghiệp vụ đăng nhập an toàn với cơ chế chặn khóa và chiếm dụng Lock phân tán.
     */
    <T> T executeSecurely(String username, Supplier<T> action);
}
