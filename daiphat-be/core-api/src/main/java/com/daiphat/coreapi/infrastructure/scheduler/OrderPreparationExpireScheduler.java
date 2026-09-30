package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.order.OrderPreparationExpiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderPreparationExpireScheduler {

    private final OrderPreparationExpiryService orderPreparationExpiryService;

    @Scheduled(
            fixedRateString = "${daiphat.order.preparing-expire-rate-ms:60000}",
            initialDelay = 30000
    )
    public void expireOverduePreparingOrders() {
        int expired = orderPreparationExpiryService.expireOverduePreparingOrders();
        if (expired > 0) {
            log.info("Expired {} overdue PREPARING orders", expired);
        } else {
            log.debug("No overdue PREPARING orders");
        }
    }
}
