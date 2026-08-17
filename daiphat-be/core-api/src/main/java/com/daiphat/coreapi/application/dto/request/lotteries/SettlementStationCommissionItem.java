package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SettlementStationCommissionItem(
        @NotNull Long lotteryStationId,
        @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal actualCommissionRate
) {
}
