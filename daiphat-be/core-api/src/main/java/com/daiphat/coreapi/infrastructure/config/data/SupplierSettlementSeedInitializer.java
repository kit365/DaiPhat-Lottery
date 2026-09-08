package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementAdjustmentRepository;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Ensures one supplier settlement per seeded supplier + draw date (yesterday /
 * today / tomorrow), links import/return FKs, applies OPEN vs payment-overdue from
 * {@code paymentCutOffTime}, and recalculates money fields from the linked batches.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true")
@Order(118)
public class SupplierSettlementSeedInitializer implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "supplier-settlement-seed";
    private static final List<String> SEED_ACTORS = List.of(
            SYSTEM_ACTOR,
            "return-batch-seed",
            "import-batch-seed",
            SupplierSettlementScenarioSeedInitializer.SYSTEM_ACTOR
    );
    private static final List<String> IMPORT_BATCH_CODE_PREFIXES = List.of(
            "PN-SEED-",
            "PN-STATUS-",
            SupplierSettlementScenarioSeedInitializer.HEADER_CODE_PREFIX
    );
    private static final String RETURN_NOTE_PREFIX = "SEED-RETURN-";

    private final ImportBatchRepository importBatchRepository;
    private final ReturnBatchRepository returnBatchRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementAdjustmentRepository supplierSettlementAdjustmentRepository;
    private final SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LocalDateTime now = LocalDateTime.now(clock);

        List<ImportBatchEntity> importBatches = loadSeedImportBatches();
        List<ReturnBatchEntity> returnBatches =
                returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(RETURN_NOTE_PREFIX);

        if (importBatches.isEmpty() && returnBatches.isEmpty()) {
            log.warn(
                    "Skip supplier-settlement seed: no PN-SEED-/PN-STATUS- import batches and no {} return batches.",
                    RETURN_NOTE_PREFIX
            );
            return;
        }

        Map<SupplierDrawKey, GroupBuckets> groups = new LinkedHashMap<>();
        for (ImportBatchEntity batch : importBatches) {
            if (batch.getSupplier() == null || batch.getSupplier().getId() == null || batch.getDrawDate() == null) {
                log.warn("Skip import batch id={}: missing supplier or drawDate.", batch.getId());
                continue;
            }
            if (batch.getStatus() == ImportBatchStatus.CANCELLED) {
                continue;
            }
            groups.computeIfAbsent(
                    new SupplierDrawKey(batch.getSupplier().getId(), batch.getDrawDate()),
                    key -> new GroupBuckets(batch.getSupplier(), batch.getDrawDate())
            ).importBatches().add(batch);
        }
        for (ReturnBatchEntity batch : returnBatches) {
            if (batch.getLotterySupplier() == null
                    || batch.getLotterySupplier().getId() == null
                    || batch.getDrawDate() == null) {
                log.warn("Skip return batch id={}: missing supplier or drawDate.", batch.getId());
                continue;
            }
            groups.computeIfAbsent(
                    new SupplierDrawKey(batch.getLotterySupplier().getId(), batch.getDrawDate()),
                    key -> new GroupBuckets(batch.getLotterySupplier(), batch.getDrawDate())
            ).returnBatches().add(batch);
        }

        if (groups.isEmpty()) {
            log.warn("Skip supplier-settlement seed: no valid supplier/drawDate groups from seed batches.");
            return;
        }

        int removedOrphans = cleanupOrphanSeedSettlements(groups.keySet());

        int created = 0;
        int reused = 0;
        int linkedImports = 0;
        int linkedReturns = 0;
        Set<Long> settlementIds = new LinkedHashSet<>();

        for (GroupBuckets group : groups.values()) {
            EnsureResult ensured = ensureSettlement(group.supplier(), group.drawDate(), now);
            if (ensured.created()) {
                created++;
            } else {
                reused++;
            }
            SupplierSettlementEntity settlement = ensured.settlement();
            settlementIds.add(settlement.getId());

            for (ImportBatchEntity importBatch : group.importBatches()) {
                if (!Objects.equals(importBatch.getSupplierSettlementId(), settlement.getId())) {
                    importBatch.setSupplierSettlementId(settlement.getId());
                    importBatch.setUpdatedAt(now);
                    importBatch.setLastModifiedBy(SYSTEM_ACTOR);
                    importBatchRepository.save(importBatch);
                    linkedImports++;
                }
            }
            for (ReturnBatchEntity returnBatch : group.returnBatches()) {
                if (!Objects.equals(returnBatch.getSupplierSettlementId(), settlement.getId())) {
                    returnBatch.setSupplierSettlementId(settlement.getId());
                    returnBatch.setUpdatedAt(now);
                    returnBatch.setLastModifiedBy(SYSTEM_ACTOR);
                    returnBatchRepository.save(returnBatch);
                    linkedReturns++;
                }
            }
        }

        importBatchRepository.flush();
        returnBatchRepository.flush();
        supplierSettlementRepository.flush();

        int refreshed = 0;
        int overdue = 0;
        for (Long settlementId : settlementIds) {
            try {
                supplierSettlementServicePort.recalculateAmounts(settlementId);
                refreshed++;
                Optional<SupplierSettlementEntity> after =
                        supplierSettlementRepository.findByIdAndDeletedAtIsNull(settlementId);
                if (after.isPresent()) {
                    SupplierSettlementEntity settlement = after.get();
                    LocalTime paymentCutOff = settlement.getLotterySupplier() != null
                            ? settlement.getLotterySupplier().getPaymentCutOffTime()
                            : null;
                    if (paymentCutOff != null && applyPaymentOverdueIfDue(settlement, now, paymentCutOff)) {
                        overdue++;
                    }
                    log.info(
                            "Settlement seed refreshed id={} code={} status={} import={} return={} remaining={} returnExpired={}",
                            settlement.getId(),
                            settlement.getSupplierSettlementCode(),
                            settlement.getStatus(),
                            settlement.getTotalImportValue(),
                            settlement.getTotalReturnValue(),
                            settlement.getRemainingAmount(),
                            settlement.isReturnExpired()
                    );
                }
            } catch (RuntimeException ex) {
                log.error("Supplier-settlement seed failed while recalculating settlementId={}", settlementId, ex);
                throw ex;
            }
        }

        log.info(
                "Supplier-settlement seed complete: groups={}, created={}, reused={}, linkedImports={}, linkedReturns={}, recalculated={}, paymentOverdue={}, orphansRemoved={}.",
                groups.size(),
                created,
                reused,
                linkedImports,
                linkedReturns,
                refreshed,
                overdue,
                removedOrphans
        );
    }

    private List<ImportBatchEntity> loadSeedImportBatches() {
        Map<Long, ImportBatchEntity> byId = new LinkedHashMap<>();
        for (String prefix : IMPORT_BATCH_CODE_PREFIXES) {
            for (ImportBatchEntity batch : importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull(prefix)) {
                if (batch.getId() != null) {
                    byId.putIfAbsent(batch.getId(), batch);
                }
            }
        }
        return new ArrayList<>(byId.values());
    }

    private EnsureResult ensureSettlement(
            LotterySupplierEntity supplier,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        Optional<SupplierSettlementEntity> existing =
                supplierSettlementRepository.findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(
                        supplier.getId(),
                        drawDate
                );
        if (existing.isPresent()) {
            SupplierSettlementEntity settlement = existing.get();
            if (settlement.getSupplierSettlementCode() == null || settlement.getSupplierSettlementCode().isBlank()) {
                String code = supplierSettlementCodeGenerator.generateCode(drawDate);
                settlement.setSupplierSettlementCode(code);
                settlement.setUpdatedAt(now);
                settlement.setLastModifiedBy(SYSTEM_ACTOR);
                settlement = supplierSettlementRepository.save(settlement);
                log.warn(
                        "Backfilled missing supplier_settlement_code on existing settlement id={} -> {}",
                        settlement.getId(),
                        code
                );
            }
            return new EnsureResult(settlement, false);
        }

        int termDays = supplier.getPaymentTermDays() != null ? supplier.getPaymentTermDays() : 0;
        if (termDays < 0) {
            termDays = 0;
        }
        String code = supplierSettlementCodeGenerator.generateCode(drawDate);
        try {
            SupplierSettlementEntity created = supplierSettlementRepository.save(
                    SupplierSettlementEntity.builder()
                            .lotterySupplier(supplier)
                            .periodFrom(drawDate)
                            .periodTo(drawDate.plusDays(termDays))
                            .supplierSettlementCode(code)
                            .totalImportValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                            .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                            .totalPaidAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                            .remainingAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                            .status(SupplierSettlementStatus.OPEN)
                            .createdAt(now)
                            .updatedAt(now)
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );
            log.info(
                    "Created supplier settlement id={} code={} supplier={} periodFrom={}",
                    created.getId(),
                    code,
                    supplier.getCode(),
                    drawDate
            );
            return new EnsureResult(created, true);
        } catch (RuntimeException ex) {
            log.error(
                    "Failed to create supplier settlement for supplier={} periodFrom={} code={}",
                    supplier.getCode(),
                    drawDate,
                    code,
                    ex
            );
            throw ex;
        }
    }

    private boolean applyPaymentOverdueIfDue(
            SupplierSettlementEntity settlement,
            LocalDateTime now,
            LocalTime paymentCutOff
    ) {
        if (settlement.getStatus() == SupplierSettlementStatus.COMPLETED) {
            return false;
        }
        if (settlement.getPeriodFrom() == null || paymentCutOff == null) {
            return false;
        }
        LocalDateTime deadlineAt = LocalDateTime.of(settlement.getPeriodFrom(), paymentCutOff);
        if (!now.isAfter(deadlineAt)) {
            if (settlement.getStatus() != SupplierSettlementStatus.OPEN) {
                settlement.setStatus(SupplierSettlementStatus.OPEN);
                settlement.setUpdatedAt(now);
                settlement.setLastModifiedBy(SYSTEM_ACTOR);
                supplierSettlementRepository.save(settlement);
            }
            return false;
        }
        if (settlement.getStatus() == SupplierSettlementStatus.RECEIPT_OVERDUE) {
            return false;
        }
        settlement.setStatus(SupplierSettlementStatus.RECEIPT_OVERDUE);
        settlement.setUpdatedAt(now);
        settlement.setLastModifiedBy(SYSTEM_ACTOR);
        supplierSettlementRepository.save(settlement);
        return true;
    }

    private int cleanupOrphanSeedSettlements(Set<SupplierDrawKey> keepKeys) {
        int removed = 0;
        for (SupplierSettlementEntity settlement : supplierSettlementRepository.findAll()) {
            if (settlement.getDeletedAt() != null || settlement.getId() == null) {
                continue;
            }
            if (!SEED_ACTORS.contains(settlement.getCreatedBy())) {
                continue;
            }
            if (settlement.getLotterySupplier() == null
                    || settlement.getLotterySupplier().getId() == null
                    || settlement.getPeriodFrom() == null) {
                continue;
            }
            SupplierDrawKey key = new SupplierDrawKey(
                    settlement.getLotterySupplier().getId(),
                    settlement.getPeriodFrom()
            );
            if (keepKeys.contains(key)) {
                continue;
            }
            boolean stillLinked =
                    !importBatchRepository
                            .findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(settlement.getId())
                            .isEmpty()
                    || !returnBatchRepository
                            .findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(settlement.getId())
                            .isEmpty();
            if (stillLinked) {
                continue;
            }
            var adjustments = supplierSettlementAdjustmentRepository
                    .findBySupplierSettlement_IdAndDeletedAtIsNull(settlement.getId());
            if (!adjustments.isEmpty()) {
                supplierSettlementAdjustmentRepository.deleteAll(adjustments);
            }
            supplierSettlementRepository.delete(settlement);
            removed++;
        }
        if (removed > 0) {
            supplierSettlementRepository.flush();
            log.info("Removed {} orphan seed supplier settlements outside the current draw window.", removed);
        }
        return removed;
    }

    private record SupplierDrawKey(Long supplierId, LocalDate drawDate) {
    }

    private static final class GroupBuckets {
        private final LotterySupplierEntity supplier;
        private final LocalDate drawDate;
        private final List<ImportBatchEntity> importBatches = new ArrayList<>();
        private final List<ReturnBatchEntity> returnBatches = new ArrayList<>();

        private GroupBuckets(LotterySupplierEntity supplier, LocalDate drawDate) {
            this.supplier = supplier;
            this.drawDate = drawDate;
        }

        private LotterySupplierEntity supplier() {
            return supplier;
        }

        private LocalDate drawDate() {
            return drawDate;
        }

        private List<ImportBatchEntity> importBatches() {
            return importBatches;
        }

        private List<ReturnBatchEntity> returnBatches() {
            return returnBatches;
        }
    }

    private record EnsureResult(SupplierSettlementEntity settlement, boolean created) {
    }
}
