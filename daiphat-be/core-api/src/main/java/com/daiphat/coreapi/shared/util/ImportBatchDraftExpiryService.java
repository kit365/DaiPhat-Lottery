package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Auto-cancels outdated DRAFT import batches:
 * <ul>
 *   <li>Past draw date — all import modes</li>
 *   <li>Same-day IN_DAY after cutoff — POST_DRAW_SUPPLEMENT (additional) batches are exempt</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchDraftExpiryService {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    @Transactional
    public int cancelOverdueDrafts() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        int cancelledCount = 0;

        for (ImportBatchModel batch : importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(today)) {
            if (cancelBatch(batch, now, ImportBatchCancelReason.DRAW_DATE_EXPIRED)) {
                cancelledCount++;
            }
        }

        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        if (isPastCutoff(now.toLocalTime(), cutoff)) {
            for (ImportBatchModel batch : importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(today)) {
                if (!batch.isSubjectToSameDayCutoffCancellation(today)) {
                    continue;
                }
                if (cancelBatch(batch, now, ImportBatchCancelReason.IMPORT_DEADLINE_PASSED)) {
                    cancelledCount++;
                }
            }
        }

        return cancelledCount;
    }

    @Transactional
    public boolean cancelIfOverdue(ImportBatchModel batch) {
        if (batch == null || batch.getStatus() != ImportBatchStatus.DRAFT) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();

        if (batch.hasExpiredDrawDate(today)) {
            return cancelBatch(batch, now, ImportBatchCancelReason.DRAW_DATE_EXPIRED);
        }

        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        if (batch.isSubjectToSameDayCutoffCancellation(today) && isPastCutoff(now.toLocalTime(), cutoff)) {
            return cancelBatch(batch, now, ImportBatchCancelReason.IMPORT_DEADLINE_PASSED);
        }

        return false;
    }

    private boolean cancelBatch(ImportBatchModel batch, LocalDateTime now, String cancelReason) {
        if (batch.getStatus() != ImportBatchStatus.DRAFT) {
            return false;
        }
        batch.markCancelled(now, cancelReason);
        importBatchRepositoryPort.save(batch);
        log.info(
                "Auto-cancelled import batch #{} (draw date {}, reason: {})",
                batch.getId(),
                batch.getDrawDate(),
                cancelReason
        );
        return true;
    }

    private boolean isPastCutoff(LocalTime currentTime, LocalTime cutoff) {
        return currentTime.isAfter(cutoff);
    }
}
