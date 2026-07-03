package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ImportBatchLineResponse(
        Long id,
        Long lotteryStationId,
        ImportBatchType batchType,
        Integer declareQuantity,
        Integer totalQuantity,
        BigDecimal importCost,
        BigDecimal totalCostValue,
        String invoiceEvidenceUrl
) {
}
