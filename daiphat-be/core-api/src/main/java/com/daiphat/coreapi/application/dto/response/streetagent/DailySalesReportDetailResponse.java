package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;

public record DailySalesReportDetailResponse(
        Long detailId,
        Long allocationBatchId,
        Long stationId,
        int allocatedQuantity,
        int soldQuantity,
        int remainingQuantity,
        BigDecimal cashCollected
) {
}
