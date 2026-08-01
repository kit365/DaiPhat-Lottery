package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.ReturnBatchAutoGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchAutoCreateScheduler {

    private final ReturnBatchAutoGenerationService returnBatchAutoGenerationService;

    @Scheduled(
            fixedRateString = "${daiphat.return-batch.auto-create-rate-ms:60000}",
            initialDelay = 45000
    )
    public void createDueReturnBatches() {
        int createdCount = returnBatchAutoGenerationService.generateDueReturnBatches();
        if (createdCount > 0) {
            log.info("Auto-created {} return batch(es)", createdCount);
        }
    }
}
