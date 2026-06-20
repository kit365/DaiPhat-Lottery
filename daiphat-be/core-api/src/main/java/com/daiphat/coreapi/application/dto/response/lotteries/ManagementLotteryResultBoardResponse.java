package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record ManagementLotteryResultBoardResponse(
        String region,
        LocalDate fromDate,
        LocalDate toDate,
        List<LotteryResultLiveItemResponse> results
) {
}
