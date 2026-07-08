package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.refund.RefundRequestStaffServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RefundRequestExpiryScheduler {

    private final RefundRequestStaffServicePort refundRequestStaffServicePort;

    @Scheduled(fixedRateString = "${daiphat.refund.expire-rate-ms:3600000}")
    public void expireOverdueRefundRequests() {
        int expiredCount = refundRequestStaffServicePort.expireOverdueRequests();
        if (expiredCount > 0) {
            log.info("Expired {} overdue refund requests", expiredCount);
        } else {
            log.debug("No overdue refund requests to expire");
        }
    }
}
