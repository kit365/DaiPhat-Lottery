package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DailySalesReportResponse(
        Long id,
        Long agentId,
        LocalDate reportDate,
        String status,
        int totalSoldQuantity,
        int totalRemainingQuantity,
        BigDecimal totalCashCollected,
        List<DailySalesReportDetailResponse> details,
        List<DailySalesReportSettlementLinkResponse> settlements
) {
}
