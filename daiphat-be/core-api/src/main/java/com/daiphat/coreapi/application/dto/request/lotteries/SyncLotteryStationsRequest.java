package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SyncLotteryStationsRequest(
        @NotNull(message = "Nguồn dữ liệu không được để trống")
        LotteryStationSourceType source,

        @NotBlank(message = "Miền không được để trống")
        String region,

        @DecimalMin(value = "0", inclusive = false, message = "Giá mặc định phải lớn hơn 0")
        BigDecimal defaultPrice
) {
}
