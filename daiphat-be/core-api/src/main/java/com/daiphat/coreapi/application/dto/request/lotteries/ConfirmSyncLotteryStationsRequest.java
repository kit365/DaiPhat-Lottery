package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record ConfirmSyncLotteryStationsRequest(
        @NotNull LotteryStationSourceType source,

        @NotBlank String region,

        @NotNull @DecimalMin(value = "0", inclusive = false)
        BigDecimal defaultPrice,

        @NotEmpty @Valid
        List<ConfirmSyncLotteryStationItem> items
) {
}
