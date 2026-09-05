package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Final pass: recalculate every open settlement money field from linked Import/Return data
 * after seeders finish (including {@link SupplierSettlementSeedInitializer}).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true")
@Order(120)
public class SupplierSettlementAmountBackfillInitializer implements ApplicationRunner {

    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementServicePort supplierSettlementServicePort;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<SupplierSettlementEntity> settlements = supplierSettlementRepository.findAll().stream()
                .filter(s -> s.getDeletedAt() == null)
                .toList();
        if (settlements.isEmpty()) {
            log.info("Supplier settlement amount backfill skipped: no settlements.");
            return;
        }

        int refreshed = 0;
        for (SupplierSettlementEntity settlement : settlements) {
            if (settlement.getId() == null) {
                continue;
            }
            try {
                supplierSettlementServicePort.recalculateAmounts(settlement.getId());
                refreshed++;
            } catch (RuntimeException ex) {
                log.error(
                        "Settlement amount backfill failed for settlementId={} code={}",
                        settlement.getId(),
                        settlement.getSupplierSettlementCode(),
                        ex
                );
                throw ex;
            }
        }
        log.info("Supplier settlement amount backfill complete: refreshed={}.", refreshed);
    }
}
