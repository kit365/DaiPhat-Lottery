package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateLotteryStationPricingItem(
        @NotNull Long lotteryStationId,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal importCost,
        @NotNull @DecimalMin(value = "0", message = "Tỷ lệ hoa hồng phải từ 0 trở lên")
        @DecimalMax(value = "1", message = "Tỷ lệ hoa hồng không vượt quá 100%")
        BigDecimal commissionRate
) {
}
