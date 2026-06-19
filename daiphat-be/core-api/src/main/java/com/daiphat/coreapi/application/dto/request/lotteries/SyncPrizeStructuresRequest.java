package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record SyncPrizeStructuresRequest(
        @NotNull(message = "Nguồn dữ liệu không được để trống")
        LotteryStationSourceType source,

        @NotBlank(message = "Miền không được để trống")
        String region
) {
}
