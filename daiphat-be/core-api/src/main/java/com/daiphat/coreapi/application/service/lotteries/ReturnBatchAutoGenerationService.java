package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;

/**
 * Auto-creates one Return Batch per supplier per draw date when
 * {@code now >= returnCutOffTime - RETURN_BUFFER_TIME}, then calculates
 * line/header summary from eligible imported serials.
 * Idempotent: safe to run repeatedly without creating duplicates; refreshes summaries for PENDING batches.
 */
@Service
@Slf4j
public class ReturnBatchAutoGenerationService {

    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final ReturnBatchSummaryCalculator returnBatchSummaryCalculator;
    private final ReturnBatchCodeGenerator returnBatchCodeGenerator;
    private final Clock clock;
    private final TransactionTemplate transactionTemplate;

    public ReturnBatchAutoGenerationService(
            LotterySupplierRepositoryPort lotterySupplierRepositoryPort,
            ImportBatchRepositoryPort importBatchRepositoryPort,
            ImportBatchLineRepositoryPort importBatchLineRepositoryPort,
            ReturnBatchRepositoryPort returnBatchRepositoryPort,
            SupplierSettlementServicePort supplierSettlementServicePort,
            ImportBatchConfigResolver importBatchConfigResolver,
            ReturnBatchSummaryCalculator returnBatchSummaryCalculator,
            ReturnBatchCodeGenerator returnBatchCodeGenerator,
            Clock clock,
            PlatformTransactionManager transactionManager
    ) {
        this.lotterySupplierRepositoryPort = lotterySupplierRepositoryPort;
        this.importBatchRepositoryPort = importBatchRepositoryPort;
        this.importBatchLineRepositoryPort = importBatchLineRepositoryPort;
        this.returnBatchRepositoryPort = returnBatchRepositoryPort;
        this.supplierSettlementServicePort = supplierSettlementServicePort;
        this.importBatchConfigResolver = importBatchConfigResolver;
        this.returnBatchSummaryCalculator = returnBatchSummaryCalculator;
        this.returnBatchCodeGenerator = returnBatchCodeGenerator;
        this.clock = clock;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Scans active suppliers: creates due return batches and refreshes PENDING summaries.
     *
     * @return number of newly created return batches
     */
    public int generateDueReturnBatches() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        int createdCount = 0;

        List<LotterySupplierModel> suppliers = lotterySupplierRepositoryPort.findAllActive();
        for (LotterySupplierModel supplier : suppliers) {
            try {
                Boolean created = transactionTemplate.execute(status ->
                        createOrEnrichIfDue(supplier, today, now, bufferMinutes)
                );
                if (Boolean.TRUE.equals(created)) {
                    createdCount++;
                }
            } catch (DataIntegrityViolationException ex) {
                log.info(
                        "Return batch already exists for supplierId={} drawDate={} (concurrent create)",
                        supplier.getId(),
                        today
                );
            } catch (Exception ex) {
                log.error(
                        "Failed auto-creating/refreshing return batch for supplierId={} drawDate={}: {}",
                        supplier.getId(),
                        today,
                        ex.getMessage(),
                        ex
                );
            }
        }
        return createdCount;
    }

    /**
     * @return true if a new return batch was created
     */
    boolean createOrEnrichIfDue(
            LotterySupplierModel supplier,
            LocalDate drawDate,
            LocalDateTime now,
            int bufferMinutes
    ) {
        if (supplier == null || supplier.getId() == null || supplier.getReturnCutOffTime() == null) {
            return false;
        }
        if (!isPastAutoCreateTrigger(supplier.getReturnCutOffTime(), drawDate, now, bufferMinutes)) {
            return false;
        }
        if (!importBatchRepositoryPort.existsNonCancelledBySupplierAndDrawDate(supplier.getId(), drawDate)) {
            return false;
        }

        List<Long> stationIds = importBatchLineRepositoryPort
                .findEligibleStationIdsBySupplierAndDrawDate(supplier.getId(), drawDate);
        if (stationIds.isEmpty()) {
            log.debug(
                    "Skip return batch auto-create supplierId={} drawDate={}: no eligible import lines",
                    supplier.getId(),
                    drawDate
            );
            return false;
        }

        var existingOpt = returnBatchRepositoryPort
                .findPrimarySupplierReturnBySupplierAndDrawDate(supplier.getId(), drawDate);
        if (existingOpt.isPresent()) {
            ReturnBatchModel existing = existingOpt.get();
            if (existing.getStatus() != null && existing.getStatus().allowsAutoEnrichment()) {
                enrichMissingStations(existing.getId(), stationIds);
                // Keep summary in sync whenever import quantities change after the return window opens.
                returnBatchSummaryCalculator.recalculate(existing.getId());
            }
            return false;
        }

        SupplierSettlementModel settlement = supplierSettlementServicePort.findOrCreateForImport(
                supplier,
                drawDate
        );

        ReturnBatchModel header = ReturnBatchModel.builder()
                .batchCode(returnBatchCodeGenerator.generateHeaderCode(drawDate))
                .lotterySupplierId(supplier.getId())
                .returnBatchType(ReturnBatchType.SUPPLIER_RETURN)
                .drawDate(drawDate)
                .supplierSettlementId(settlement.getId())
                .note("Tự động tạo theo lịch trả vé NCC")
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .build();
        ReturnBatchModel saved = returnBatchRepositoryPort.save(header);

        for (Long stationId : stationIds) {
            savePendingLine(saved.getId(), stationId);
        }

        // Summary is calculated when the return window opens (same moment as auto-create), not before.
        returnBatchSummaryCalculator.recalculate(saved.getId());

        log.info(
                "Auto-created return batch id={} supplierId={} drawDate={} settlementId={} stations={}",
                saved.getId(),
                supplier.getId(),
                drawDate,
                settlement.getId(),
                stationIds.size()
        );
        return true;
    }

    static boolean isPastAutoCreateTrigger(
            LocalTime returnCutOffTime,
            LocalDate drawDate,
            LocalDateTime now,
            int bufferMinutes
    ) {
        LocalDateTime triggerAt = LocalDateTime.of(drawDate, returnCutOffTime)
                .minusMinutes(Math.max(0, bufferMinutes));
        return !now.isBefore(triggerAt);
    }

    private void enrichMissingStations(Long returnBatchId, List<Long> eligibleStationIds) {
        Set<Long> existing = returnBatchRepositoryPort.findLinesByBatchId(returnBatchId).stream()
                .map(ReturnBatchLineModel::getLotteryStationId)
                .collect(Collectors.toCollection(HashSet::new));
        for (Long stationId : eligibleStationIds) {
            if (!existing.contains(stationId)) {
                savePendingLine(returnBatchId, stationId);
                log.info(
                        "Auto-enriched return batch id={} with stationId={}",
                        returnBatchId,
                        stationId
                );
            }
        }
    }

    private void savePendingLine(Long returnBatchId, Long stationId) {
        ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                .returnBatchId(returnBatchId)
                .lotteryStationId(stationId)
                .status(ReturnBatchLineStatus.PENDING)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .build();
        returnBatchRepositoryPort.saveLine(line);
    }
}
