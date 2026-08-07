package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.ReturnBatchReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchReminderScheduler {

    private final ReturnBatchReminderService returnBatchReminderService;

    @Scheduled(
            fixedRateString = "${daiphat.return-batch.reminder-rate-ms:60000}",
            initialDelay = 40000
    )
    public void sendInspectionReminders() {
        int notifiedCount = returnBatchReminderService.sendReturnBatchInspectionReminders();
        if (notifiedCount > 0) {
            log.info("Sent in-app return batch inspection reminders for {} batch(es)", notifiedCount);
        }
    }
}
