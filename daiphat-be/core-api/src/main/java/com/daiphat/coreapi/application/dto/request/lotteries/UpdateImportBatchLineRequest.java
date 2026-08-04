package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record UpdateImportBatchLineRequest(
        Long id,
        @NotNull Long lotteryStationId,
        @NotNull Integer declareQuantity,
        /** Optional; backend overwrites from station for editable lines. */
        @DecimalMin(value = "0.001", inclusive = true, message = "Giá vốn phải lớn hơn 0")
        BigDecimal importCost,
        Boolean removed
) {
}
