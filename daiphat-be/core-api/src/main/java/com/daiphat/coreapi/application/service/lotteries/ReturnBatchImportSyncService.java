package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Synchronizes returnable inventory into the normal supplier return batch
 * after an import batch for the same supplier and draw date is completed.
 *
 * <p>Only {@code SUPPLIER_RETURN} is queried. Reconciliation adjustment
 * batches, notably {@code EXCESS_SUPPLIER_RETURN}, contain an explicit serial
 * selection and must never be enriched automatically.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchImportSyncService {

    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final ReturnBatchSummaryCalculator returnBatchSummaryCalculator;

    public void refreshOpenPrimarySupplierReturn(Long supplierId, LocalDate drawDate) {
        if (supplierId == null || drawDate == null) {
            return;
        }
        returnBatchRepositoryPort
                .findPrimarySupplierReturnBySupplierAndDrawDate(supplierId, drawDate)
                .filter(batch -> batch.getStatus() != null && batch.getStatus().allowsAutoEnrichment())
                .ifPresent(batch -> {
                    List<Long> stationIds = importBatchLineRepositoryPort
                            .findEligibleStationIdsBySupplierAndDrawDate(supplierId, drawDate);
                    enrichMissingStations(batch.getId(), stationIds);
                    returnBatchSummaryCalculator.recalculate(batch.getId());
                    log.info(
                            "Refreshed open supplier return batch id={} from completed import supplierId={} drawDate={}",
                            batch.getId(),
                            supplierId,
                            drawDate
                    );
                });
    }

    private void enrichMissingStations(Long returnBatchId, List<Long> eligibleStationIds) {
        if (returnBatchId == null || eligibleStationIds == null || eligibleStationIds.isEmpty()) {
            return;
        }
        Set<Long> existing = returnBatchRepositoryPort.findLinesByBatchId(returnBatchId).stream()
                .map(ReturnBatchLineModel::getLotteryStationId)
                .collect(Collectors.toCollection(HashSet::new));
        for (Long stationId : eligibleStationIds) {
            if (stationId == null || existing.contains(stationId)) {
                continue;
            }
            returnBatchRepositoryPort.saveLine(ReturnBatchLineModel.builder()
                    .returnBatchId(returnBatchId)
                    .lotteryStationId(stationId)
                    .status(ReturnBatchLineStatus.PENDING)
                    .totalQuantity(0)
                    .totalReturnValue(BigDecimal.ZERO)
                    .build());
        }
    }
}
