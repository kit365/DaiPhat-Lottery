package com.daiphat.accountservice.application.port.out.auth;

import java.time.Duration;

/**
 * Port cho cơ chế khóa phân tán.
 * Giúp cô lập logic locking khỏi hạ tầng cụ thể (Redis, Zookeeper, v.v.).
 */
public interface DistributedLockPort {
    /**
     * Thử lấy khóa.
     * 
     * @param key Khóa định danh duy nhất.
     * @param timeout Thời gian sống của khóa (TTL).
     * @return true nếu lấy được khóa, false nếu thất bại.
     */
    boolean tryLock(String key, Duration timeout);

    /**
     * Giải phóng khóa.
     * 
     * @param key Khóa định danh cần giải phóng.
     */
    void unlock(String key);
}
