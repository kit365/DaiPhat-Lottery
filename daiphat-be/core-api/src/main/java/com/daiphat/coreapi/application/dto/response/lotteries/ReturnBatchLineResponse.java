package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ReturnBatchLineResponse(
        Long id,
        Long returnBatchId,
        Long lotteryStationId,
        String lotteryStationName,
        ReturnBatchLineStatus status,
        String statusLabel,
        Integer totalQuantity,
        Integer remainingInspectableQuantity,
        BigDecimal totalReturnValue,
        Long attachedSerialCount
) {
}
