package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Builder
public record LotteryWinningCheckResponse(
        @JsonView(Views.Public.class) Long resultId,
        @JsonView(Views.Public.class) Long stationId,
        @JsonView(Views.Public.class) String stationName,
        @JsonView(Views.Public.class) LocalDate drawDate,
        @JsonView(Views.Public.class) String ticketNumber,
        @JsonView(Views.Public.class) String resultStatus,
        @JsonView(Views.Public.class) boolean resultAvailable,
        @JsonView(Views.Public.class) boolean canCheck,
        @JsonView(Views.Public.class) boolean winning,
        @JsonView(Views.Public.class) BigDecimal totalWinningAmount,
        @JsonView(Views.Public.class) List<LotteryWinningPrizeResponse> matchedPrizes
) {
}
