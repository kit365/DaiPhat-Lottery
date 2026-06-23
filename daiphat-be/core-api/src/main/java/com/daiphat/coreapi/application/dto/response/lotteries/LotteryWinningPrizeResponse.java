package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record LotteryWinningPrizeResponse(
        @JsonView(Views.Public.class) String prizeLevel,
        @JsonView(Views.Public.class) String prizeDisplayName,
        @JsonView(Views.Public.class) String prizeCode,
        @JsonView(Views.Public.class) BigDecimal prizeValue,
        @JsonView(Views.Public.class) Integer matchDigits,
        @JsonView(Views.Public.class) String matchFrom,
        @JsonView(Views.Public.class) String matchFromDisplayName,
        @JsonView(Views.Public.class) String winningNumber
) {
}
