package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySalesReportSettlementLinkResponse(
        Long settlementId,
        Long allocationBatchId,
        String batchCode,
        LocalDate settlementDate,
        BigDecimal agentReceives,
        BigDecimal agentPays,
        String status
) {
}
