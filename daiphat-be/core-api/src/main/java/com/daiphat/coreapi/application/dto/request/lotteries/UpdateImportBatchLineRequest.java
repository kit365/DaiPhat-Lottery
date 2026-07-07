package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record UpdateImportBatchLineRequest(
        Long id,
        @NotNull Long lotteryStationId,
        @NotNull Integer declareQuantity,
        @NotNull BigDecimal importCost,
        Boolean removed
) {
}
