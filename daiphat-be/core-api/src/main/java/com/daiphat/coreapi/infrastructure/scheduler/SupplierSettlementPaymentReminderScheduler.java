package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.SupplierSettlementPaymentReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SupplierSettlementPaymentReminderScheduler {

    private final SupplierSettlementPaymentReminderService paymentReminderService;

    @Scheduled(
            fixedRateString = "${daiphat.supplier-settlement.payment-reminder-rate-ms:60000}",
            initialDelay = 45000
    )
    public void sendPaymentDueReminders() {
        int notifiedCount = paymentReminderService.sendPaymentDueReminders();
        if (notifiedCount > 0) {
            log.info("Sent in-app supplier-settlement payment reminders for {} settlement(s)", notifiedCount);
        }
    }
}
