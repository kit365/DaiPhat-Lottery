package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SyncLotteryResultsRequest(
        @NotBlank String region,
        @NotNull LocalDate fromDate,
        @NotNull LocalDate toDate,
        LotteryStationSourceType source
) {
}
