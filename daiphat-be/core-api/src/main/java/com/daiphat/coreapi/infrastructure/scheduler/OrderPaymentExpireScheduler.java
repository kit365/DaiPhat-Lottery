package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.order.TransactionServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderPaymentExpireScheduler {

    private final TransactionServicePort transactionServicePort;

    @Scheduled(
            fixedRateString = "${daiphat.order.pending-payment-expire-rate-ms}",
            initialDelay = 30000
    )
    public void expirePendingPayments() {
        int expiredCount = transactionServicePort.expirePendingPayments();
        if (expiredCount > 0) {
            log.info("Expired {} pending payment orders", expiredCount);
        } else {
            log.debug("No pending payment orders due for expiration");
        }
    }
}
