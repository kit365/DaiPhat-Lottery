package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Corrects only a station's commission rate.
 *
 * <p>{@code lottery_stations.price} is the sale price and must stay untouched.
 * Matching uses NCC {@code defaultImportCost}, not this field.
 */
public record UpdateLotteryStationCommissionItem(
        @NotNull Long lotteryStationId,
        @NotNull
        @DecimalMin(value = "0", message = "Tỷ lệ hoa hồng phải từ 0 trở lên")
        @DecimalMax(value = "1", message = "Tỷ lệ hoa hồng không vượt quá 100%")
        BigDecimal commissionRate
) {
}
