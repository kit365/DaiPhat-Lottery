package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record ImportBatchLineResponse(
        Long id,
        Long lotteryStationId,
        ImportBatchType batchType,
        String batchCode,
        Integer declareQuantity,
        BigDecimal declaredCostValue,
        Integer totalQuantity,
        BigDecimal importCost,
        BigDecimal totalCostValue,
        ImportBatchLineStatus status,
        LocalDateTime importedAt,
        String cancelReason
) {
}
