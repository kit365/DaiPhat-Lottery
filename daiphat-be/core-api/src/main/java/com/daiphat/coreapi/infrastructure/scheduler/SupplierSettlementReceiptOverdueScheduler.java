package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SupplierSettlementReceiptOverdueScheduler {

    private final SupplierSettlementServicePort supplierSettlementServicePort;

    @Scheduled(
            fixedRateString = "${daiphat.supplier-settlement.receipt-overdue-rate-ms:60000}",
            initialDelay = 55000
    )
    public void markReceiptOverdueSettlements() {
        int updated = supplierSettlementServicePort.markReceiptOverdueSettlements();
        if (updated > 0) {
            log.info("Cronjob: Marked {} supplier settlement(s) as payment overdue (RECEIPT_OVERDUE)", updated);
        }
    }
}
