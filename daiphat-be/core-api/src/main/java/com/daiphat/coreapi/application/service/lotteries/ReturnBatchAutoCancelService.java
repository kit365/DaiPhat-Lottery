package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.shared.util.ReturnBatchCutoffTiming;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchAutoCancelService {

    private static final List<ReturnBatchStatus> OPEN_INSPECTION_STATUSES = List.of(
            ReturnBatchStatus.PENDING_INSPECTION,
            ReturnBatchStatus.INSPECTING
    );

    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final Clock clock;

    @Transactional
    public int cancelExpiredOpenBatches() {
        LocalDateTime now = LocalDateTime.now(clock);
        int cancelled = 0;
        for (ReturnBatchModel batch : returnBatchRepositoryPort.findByStatuses(OPEN_INSPECTION_STATUSES)) {
            if (cancelIfPastCutoff(batch, now)) {
                cancelled++;
                if (batch.getSupplierSettlementId() != null) {
                    supplierSettlementServicePort.recalculateAmounts(batch.getSupplierSettlementId());
                }
            }
        }
        return cancelled;
    }

    /**
     * Cancels the batch when past supplier cutoff. Returns {@code true} if status became CANCELLED.
     */
    @Transactional
    public boolean cancelIfPastCutoff(ReturnBatchModel batch) {
        return cancelIfPastCutoff(batch, LocalDateTime.now(clock));
    }

    private boolean cancelIfPastCutoff(ReturnBatchModel batch, LocalDateTime now) {
        if (batch == null || batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            return false;
        }
        LocalTime cutOff = batch.getReturnCutOffTime();
        if (cutOff == null && batch.getLotterySupplierId() != null) {
            cutOff = lotterySupplierRepositoryPort.findById(batch.getLotterySupplierId())
                    .map(LotterySupplierModel::getReturnCutOffTime)
                    .orElse(null);
            batch.setReturnCutOffTime(cutOff);
        }
        if (!ReturnBatchCutoffTiming.isPastCutoff(batch.getDrawDate(), cutOff, now)) {
            return false;
        }
        batch.setStatus(ReturnBatchStatus.CANCELLED);
        batch.setCancelReason(ReturnBatchCancelReason.CUTOFF_EXCEEDED);
        batch.setCancelledAt(now);
        returnBatchRepositoryPort.save(batch);
        log.info(
                "Auto-cancelled return batch id={} supplierId={} drawDate={} reason={}",
                batch.getId(),
                batch.getLotterySupplierId(),
                batch.getDrawDate(),
                ReturnBatchCancelReason.CUTOFF_EXCEEDED
        );
        return true;
    }
}
