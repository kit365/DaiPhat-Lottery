package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-cancels outdated import batch lines for past draw dates (IN_DAY only;
 * POST_DRAW_SUPPLEMENT and ADJUSTMENT lines are exempt).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchDraftExpiryService {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final Clock clock;

    @Transactional
    public int cancelOverdueDrafts() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        int cancelledBatchCount = 0;

        for (ImportBatchModel batch : importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(today)) {
            if (processBatchExpiry(batch, now)) {
                cancelledBatchCount++;
            }
        }

        return cancelledBatchCount;
    }

    @Transactional
    public boolean cancelIfOverdue(ImportBatchModel batch) {
        if (batch == null || !batch.isEditable()) {
            return false;
        }

        return processBatchExpiry(batch, LocalDateTime.now(clock));
    }

    private boolean processBatchExpiry(ImportBatchModel batch, LocalDateTime now) {
        if (!batch.isEditable() || batch.isExemptFromAutoCancellation()) {
            return false;
        }

        ensureLinesLoaded(batch);
        LocalDate today = now.toLocalDate();
        boolean anyLineCancelled = false;

        for (ImportBatchLineModel line : batch.getActiveLines()) {
            if (!isCancellableLine(line)) {
                continue;
            }

            String cancelReason = resolveLineCancelReason(batch, line, today);
            if (cancelReason == null) {
                continue;
            }

            line.markCancelled(now, cancelReason);
            importBatchLineRepositoryPort.save(line);
            anyLineCancelled = true;
            log.info(
                    "Auto-cancelled import batch line #{} for station {} (batch #{}): {}",
                    line.getId(),
                    line.getLotteryStationId(),
                    batch.getId(),
                    cancelReason
            );
        }

        if (anyLineCancelled) {
            batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batch.getId()));
            batch.recalculateAggregates();
            batch.refreshImportStatus(now);
        }

        if (batch.areAllActiveLinesCancelled()) {
            batch.markCancelled(now, ImportBatchCancelReason.ALL_LINES_CANCELLED);
            importBatchRepositoryPort.save(batch);
            log.info(
                    "Auto-cancelled import batch #{} because all lines were cancelled (draw date {})",
                    batch.getId(),
                    batch.getDrawDate()
            );
            return true;
        }

        if (anyLineCancelled) {
            importBatchRepositoryPort.save(batch);
        }

        return batch.getStatus() == ImportBatchStatus.CANCELLED;
    }

    private String resolveLineCancelReason(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            LocalDate today
    ) {
        if (batch.isExemptFromAutoCancellation() || line.isExemptFromAutoCancellation()) {
            return null;
        }

        if (batch.hasExpiredDrawDate(today)) {
            return ImportBatchLineCancelReason.drawDateExpired(resolveStationName(line.getLotteryStationId()));
        }

        return null;
    }

    private void ensureLinesLoaded(ImportBatchModel batch) {
        if (batch.getId() == null) {
            return;
        }
        List<ImportBatchLineModel> lines = batch.getActiveLines();
        if (lines == null || lines.isEmpty()) {
            batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batch.getId()));
        }
    }

    private String resolveStationName(Long stationId) {
        if (stationId == null) {
            return null;
        }
        LotteryStationModel station = lotteryStationServicePort.getModelById(stationId);
        return station != null ? station.getName() : null;
    }

    private boolean isCancellableLine(ImportBatchLineModel line) {
        if (line.isExemptFromAutoCancellation()) {
            return false;
        }
        ImportBatchLineStatus status = line.getStatus();
        return status == ImportBatchLineStatus.OPEN
                || status == ImportBatchLineStatus.IMPORTING
                || status == ImportBatchLineStatus.PAUSED;
    }
}
