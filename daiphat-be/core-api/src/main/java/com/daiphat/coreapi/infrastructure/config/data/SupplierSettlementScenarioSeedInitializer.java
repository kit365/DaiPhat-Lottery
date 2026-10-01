package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementAdjustmentRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * One-way cleanup for the supplier-settlement scenario dataset that pre-dated
 * the official demo seed. It intentionally creates no replacement data.
 *
 * <p>The cleanup runs before the official import seed so application restarts
 * cannot leave MINH_NGOC batches, returns, settlements or ticket serials mixed
 * with the current MINH_CHINH dataset.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(91)
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class SupplierSettlementScenarioSeedInitializer implements ApplicationRunner {

    private static final String LEGACY_ACTOR = "settlement-scenario-seed";
    private static final String LEGACY_SUPPLIER_CODE = "MINH_NGOC";
    private static final String LEGACY_SERIAL_PREFIX = "IBSETTLE-";

    private final LotterySupplierRepository lotterySupplierRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final ReturnBatchRepository returnBatchRepository;
    private final ReturnBatchLineRepository returnBatchLineRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementAdjustmentRepository supplierSettlementAdjustmentRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Set<Long> settlementIds = new LinkedHashSet<>();
        int removedReturns = removeLegacyReturns(settlementIds);
        int removedImports = removeLegacyImports(settlementIds);
        int removedSettlements = removeLegacySettlements(settlementIds);
        log.info(
                "Legacy MINH_NGOC seed cleanup complete: returns={}, imports={}, settlements={}.",
                removedReturns,
                removedImports,
                removedSettlements
        );
    }

    private int removeLegacyReturns(Set<Long> settlementIds) {
        Map<Long, ReturnBatchEntity> batchesById = new LinkedHashMap<>();
        addReturnBatches(batchesById, returnBatchRepository.findByCreatedByAndDeletedAtIsNull(LEGACY_ACTOR));
        addReturnBatches(
                batchesById,
                returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull("SEED-RETURN-SETTLE-")
        );
        addReturnBatches(
                batchesById,
                returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(SeedDocumentCodes.RETURN_NOTE_PREFIX)
                        .stream()
                        .filter(this::belongsToLegacySupplier)
                        .toList()
        );

        List<ReturnBatchEntity> batches = new ArrayList<>(batchesById.values());
        List<Long> lineIds = new ArrayList<>();
        for (ReturnBatchEntity batch : batches) {
            if (batch.getSupplierSettlementId() != null) {
                settlementIds.add(batch.getSupplierSettlementId());
            }
            for (ReturnBatchLineEntity line :
                    returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(batch.getId())) {
                if (line.getId() != null) {
                    lineIds.add(line.getId());
                }
            }
        }
        if (!lineIds.isEmpty()) {
            for (LotteryTicketSerialEntity serial :
                    lotteryTicketSerialRepository.findByReturnBatchLineIdInAndDeletedAtIsNull(lineIds)) {
                serial.setReturnBatchLineId(null);
                serial.setReturnedAt(null);
                if (serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
                    serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
                }
                serial.setLastModifiedBy(LEGACY_ACTOR);
                lotteryTicketSerialRepository.save(serial);
            }
            returnBatchLineRepository.deleteAll(returnBatchLineRepository.findAllById(lineIds));
            returnBatchLineRepository.flush();
        }
        if (!batches.isEmpty()) {
            returnBatchRepository.deleteAll(batches);
            returnBatchRepository.flush();
        }
        return batches.size();
    }

    private int removeLegacyImports(Set<Long> settlementIds) {
        Map<Long, ImportBatchEntity> batchesById = new LinkedHashMap<>();
        addImportBatches(
                batchesById,
                importBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(
                        SeedDocumentCodes.IMPORT_NOTE_PREFIX + "SETTLE"
                )
        );
        addImportBatches(
                batchesById,
                importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull("PN-SETTLE-")
        );
        addImportBatches(
                batchesById,
                importBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(SeedDocumentCodes.IMPORT_NOTE_PREFIX)
                        .stream()
                        .filter(this::belongsToLegacySupplier)
                        .toList()
        );
        List<ImportBatchEntity> batches = new ArrayList<>(batchesById.values());
        Set<Long> lineIds = new LinkedHashSet<>();
        for (ImportBatchEntity batch : batches) {
            if (batch.getSupplierSettlementId() != null) {
                settlementIds.add(batch.getSupplierSettlementId());
            }
            for (ImportBatchLineEntity line : importBatchLineRepository.findByImportBatch_Id(batch.getId())) {
                if (line.getId() != null) {
                    lineIds.add(line.getId());
                }
            }
        }

        Map<Long, LotteryTicketSerialEntity> serialsById = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial :
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(LEGACY_SERIAL_PREFIX)) {
            serialsById.put(serial.getId(), serial);
        }
        if (!lineIds.isEmpty()) {
            for (LotteryTicketSerialEntity serial : lotteryTicketSerialRepository.findByImportBatchLine_IdIn(lineIds)) {
                serialsById.put(serial.getId(), serial);
            }
        }

        Set<Long> ticketIds = new LinkedHashSet<>();
        List<Long> serialIds = serialsById.keySet().stream().toList();
        if (!serialIds.isEmpty()) {
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(serialIds);
        }
        for (LotteryTicketSerialEntity serial : serialsById.values()) {
            if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                ticketIds.add(serial.getTicket().getId());
            }
            lotteryTicketSerialRepository.delete(serial);
        }
        if (!serialsById.isEmpty()) {
            lotteryTicketSerialRepository.flush();
        }
        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }
        lotteryTicketRepository.flush();
        if (!batches.isEmpty()) {
            importBatchRepository.deleteAll(batches);
            importBatchRepository.flush();
        }
        return batches.size();
    }

    private int removeLegacySettlements(Set<Long> settlementIds) {
        lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(LEGACY_SUPPLIER_CODE)
                .ifPresent(supplier -> supplierSettlementRepository.findAll().stream()
                        .filter(item -> item.getDeletedAt() == null)
                        .filter(item -> item.getLotterySupplier() != null)
                        .filter(item -> supplier.getId().equals(item.getLotterySupplier().getId()))
                        .filter(item -> LEGACY_ACTOR.equals(item.getCreatedBy())
                                || "supplier-settlement-seed".equals(item.getCreatedBy())
                                || "return-batch-seed".equals(item.getCreatedBy()))
                        .map(SupplierSettlementEntity::getId)
                        .forEach(settlementIds::add));

        int removed = 0;
        for (Long settlementId : settlementIds) {
            SupplierSettlementEntity settlement = supplierSettlementRepository.findById(settlementId).orElse(null);
            if (settlement == null) {
                continue;
            }
            var adjustments = supplierSettlementAdjustmentRepository
                    .findBySupplierSettlement_IdAndDeletedAtIsNull(settlementId);
            if (!adjustments.isEmpty()) {
                supplierSettlementAdjustmentRepository.deleteAll(adjustments);
            }
            supplierSettlementRepository.delete(settlement);
            removed++;
        }
        if (removed > 0) {
            supplierSettlementRepository.flush();
        }
        return removed;
    }

    private boolean belongsToLegacySupplier(ReturnBatchEntity batch) {
        return batch.getLotterySupplier() != null
                && LEGACY_SUPPLIER_CODE.equalsIgnoreCase(batch.getLotterySupplier().getCode());
    }

    private boolean belongsToLegacySupplier(ImportBatchEntity batch) {
        return batch.getSupplier() != null
                && LEGACY_SUPPLIER_CODE.equalsIgnoreCase(batch.getSupplier().getCode());
    }

    private static void addReturnBatches(Map<Long, ReturnBatchEntity> target, List<ReturnBatchEntity> batches) {
        for (ReturnBatchEntity batch : batches) {
            if (batch.getId() != null) {
                target.putIfAbsent(batch.getId(), batch);
            }
        }
    }

    private static void addImportBatches(Map<Long, ImportBatchEntity> target, List<ImportBatchEntity> batches) {
        for (ImportBatchEntity batch : batches) {
            if (batch.getId() != null) {
                target.putIfAbsent(batch.getId(), batch);
            }
        }
    }
}
