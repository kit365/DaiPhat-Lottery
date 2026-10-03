package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.service.lotteries.ReturnBatchImportSyncService;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;

/** Reuses the live import lifecycle for daily seed documents, including restart repair. */
@Component
@Order(199)
@RequiredArgsConstructor
@ConditionalOnProperty(value = {"daiphat.lottery.seed.enabled", "daiphat.lottery.seed.daily-only"},
        havingValue = "true")
public class DailyImportDocumentsSeedInitializer implements ApplicationRunner {
    private final ImportBatchRepository importBatchRepository;
    private final LotterySupplierServicePort supplierService;
    private final SupplierSettlementServicePort settlementService;
    private final ReturnBatchImportSyncService returnSyncService;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LocalDate today = LocalDate.now(clock);
        for (var batch : importBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(
                SeedDocumentCodes.IMPORT_NOTE_PREFIX + "MAIN")) {
            if ((!today.equals(batch.getDrawDate()) && !today.plusDays(1).equals(batch.getDrawDate()))
                    || batch.getSupplier() == null
                    || batch.getStatus() == com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.CANCELLED) {
                continue;
            }
            var supplier = supplierService.getActiveModelById(batch.getSupplier().getId());
            var settlement = settlementService.findOrCreateForImport(supplier, batch.getDrawDate());
            batch.setSupplierSettlementId(settlement.getId());
            importBatchRepository.saveAndFlush(batch);
            returnSyncService.refreshOpenPrimarySupplierReturn(
                    supplier.getId(), batch.getDrawDate(), settlement.getId());
            settlementService.recalculateTotalImportValue(settlement.getId());
        }
    }
}
