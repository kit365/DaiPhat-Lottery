package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record CreateImportBatchLineRequest(
        @NotNull(message = "Nhà đài không được để trống")
        Long lotteryStationId,

        @NotNull(message = "Số lượng khai báo không được để trống")
        @Min(value = 1, message = "Số lượng khai báo phải lớn hơn 0")
        Integer declareQuantity,

        @NotNull(message = "Giá vốn không được để trống")
        @DecimalMin(value = "0.01", message = "Giá vốn phải lớn hơn 0")
        BigDecimal importCost
) {
}
