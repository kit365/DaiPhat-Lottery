package com.daiphat.accountservice.infrastructure.scheduler;

import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Scheduler dọn dẹp hệ thống.
 * Tự động xóa các tài khoản PENDING quá 7 ngày.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserCleanupScheduler {

    private final UserRepositoryPort userRepositoryPort;

    /**
     * Chạy vào lúc 3 giờ sáng mỗi ngày.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupInactiveUsers() {
        log.info("--- BẮT ĐẦU QUY TRÌNH DỌN DẸP USER INACTIVE ---");
        
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        
        try {
            long deletedCount = userRepositoryPort.deleteInactiveUsers(UserStatus.PENDING, sevenDaysAgo);
            
            if (deletedCount > 0) {
                log.info("Dọn dẹp thành công: Đã xóa {} tài khoản PENDING quá hạn (7 ngày).", deletedCount);
            } else {
                log.info("Không có tài khoản nào cần dọn dẹp.");
            }
        } catch (Exception e) {
            log.error("Lỗi trong quá trình dọn dẹp User: {}", e.getMessage());
        }
        
        log.info("--- KẾT THÚC QUY TRÌNH DỌN DẸP ---");
    }
}
