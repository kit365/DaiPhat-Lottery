package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ImportBatchDraftCancelScheduler {

    private final ImportBatchDraftExpiryService importBatchDraftExpiryService;

    @Scheduled(
            fixedRateString = "${daiphat.import-batch.draft-cancel-rate-ms}",
            initialDelay = 30000
    )
    public void cancelOverdueDraftBatches() {
        int cancelledCount = importBatchDraftExpiryService.cancelOverdueDrafts();
        if (cancelledCount > 0) {
            log.info("Auto-cancelled {} overdue import batch draft(s)", cancelledCount);
        }
    }
}
