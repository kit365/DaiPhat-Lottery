package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record LotteryResultBoardSummaryResponse(
        @JsonView(Views.Public.class) String region,
        @JsonView(Views.Public.class) LocalDate drawDate,
        @JsonView(Views.Public.class) List<LotteryResultResponse> results
) {
}
