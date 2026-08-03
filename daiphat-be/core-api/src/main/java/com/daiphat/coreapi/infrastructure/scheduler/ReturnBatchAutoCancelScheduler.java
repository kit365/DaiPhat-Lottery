package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.ReturnBatchAutoCancelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchAutoCancelScheduler {

    private final ReturnBatchAutoCancelService returnBatchAutoCancelService;

    @Scheduled(
            fixedRateString = "${daiphat.return-batch.auto-cancel-rate-ms:60000}",
            initialDelay = 50000
    )
    public void cancelExpiredReturnBatches() {
        int cancelledCount = returnBatchAutoCancelService.cancelExpiredOpenBatches();
        if (cancelledCount > 0) {
            log.info("Auto-cancelled {} return batch(es) past supplier cutoff", cancelledCount);
        }
    }
}
