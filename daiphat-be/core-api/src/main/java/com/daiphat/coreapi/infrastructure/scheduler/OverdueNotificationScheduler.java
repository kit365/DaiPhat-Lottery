package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.PrizeClaimSubmissionService;
import com.daiphat.coreapi.application.service.payout.PrizePayoutPartialPayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job cảnh báo quá hạn:
 * <ul>
 *   <li>PrizeClaimSubmission: PAYMENT_PENDING + paymentDeadline < today
 *   <li>PrizePayoutRequest: AWAITING_FUND + commitmentExpiresAt < today
 * </ul>
 * Chạy 8h sáng hằng ngày.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OverdueNotificationScheduler {

    private final PrizeClaimSubmissionService prizeClaimSubmissionService;
    private final PrizePayoutPartialPayoutService prizePayoutPartialPayoutService;

    @Scheduled(
            cron = "0 0 8 * * ?",
            zone = "Asia/Ho_Chi_Minh"
    )
    public void checkOverdueSubmissions() {
        log.info("Running overdue submissions check...");
        int count = prizeClaimSubmissionService.markOverdueSubmissions();
        if (count > 0) {
            log.info("Marked {} submissions as overdue", count);
        }
    }

    @Scheduled(
            cron = "0 0 8 * * ?",
            zone = "Asia/Ho_Chi_Minh"
    )
    public void checkOverdueCommitments() {
        log.info("Running overdue commitment check...");
        int count = prizePayoutPartialPayoutService.markExpiredCommitments();
        if (count > 0) {
            log.info("Marked {} payout requests as overdue commitment", count);
        }
    }
}
