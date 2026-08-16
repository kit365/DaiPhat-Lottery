package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;

public interface SupplierSettlementReconciliationReportServicePort {
    ContractPdfDocument generatePdf(Long settlementId);
}
