package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Creates the normal supplier return receipt alongside its import batch and
 * synchronizes returnable inventory after imports for the same supplier/date.
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
    private final ReturnBatchCodeGenerator returnBatchCodeGenerator;

    @Transactional
    public void refreshOpenPrimarySupplierReturn(Long supplierId, LocalDate drawDate) {
        refreshOpenPrimarySupplierReturn(supplierId, drawDate, null);
    }

    /**
     * Ensures that an import has its primary supplier-return receipt. Existing
     * open receipts are enriched; a missing receipt is created when the import
     * already owns a settlement. Its monetary summary remains zero until ticket
     * import completion or the normal return-window synchronization recalculates it.
     */
    @Transactional
    public void refreshOpenPrimarySupplierReturn(
            Long supplierId,
            LocalDate drawDate,
            Long supplierSettlementId
    ) {
        if (supplierId == null || drawDate == null) {
            return;
        }
        var existing = returnBatchRepositoryPort
                .findPrimarySupplierReturnBySupplierAndDrawDate(supplierId, drawDate);
        if (existing.isPresent()) {
            ReturnBatchModel batch = existing.get();
            if (batch.getStatus() == null || !batch.getStatus().allowsAutoEnrichment()) {
                return;
            }
            List<Long> stationIds = importBatchLineRepositoryPort
                    .findEligibleStationIdsBySupplierAndDrawDate(supplierId, drawDate);
            if (stationIds.isEmpty()) {
                return;
            }
            enrichMissingStations(batch.getId(), stationIds);
            returnBatchSummaryCalculator.recalculate(batch.getId());
            log.info(
                    "Refreshed open supplier return batch id={} from completed import supplierId={} drawDate={}",
                    batch.getId(), supplierId, drawDate
            );
            return;
        }

        // A settlement is created with every import batch. Requiring its id here
        // prevents this compatibility overload from inventing unrelated receipts.
        if (supplierSettlementId == null) {
            return;
        }
        List<Long> stationIds = importBatchLineRepositoryPort
                .findEligibleStationIdsBySupplierAndDrawDate(supplierId, drawDate);
        if (stationIds.isEmpty()) {
            return;
        }
        ReturnBatchModel saved = returnBatchRepositoryPort.save(ReturnBatchModel.builder()
                .batchCode(returnBatchCodeGenerator.generateHeaderCode(drawDate))
                .lotterySupplierId(supplierId)
                .returnBatchType(ReturnBatchType.SUPPLIER_RETURN)
                .drawDate(drawDate)
                .supplierSettlementId(supplierSettlementId)
                .note("Tự động tạo khi hoàn tất nhập lô")
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .build());
        for (Long stationId : stationIds) {
            savePendingLine(saved.getId(), stationId);
        }
        log.info(
                "Created supplier return batch id={} from completed import supplierId={} drawDate={} settlementId={} stations={}",
                saved.getId(), supplierId, drawDate, supplierSettlementId, stationIds.size()
        );
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
            savePendingLine(returnBatchId, stationId);
        }
    }

    private void savePendingLine(Long returnBatchId, Long stationId) {
        returnBatchRepositoryPort.saveLine(ReturnBatchLineModel.builder()
                .returnBatchId(returnBatchId)
                .lotteryStationId(stationId)
                .status(ReturnBatchLineStatus.PENDING)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .build());
    }
}
