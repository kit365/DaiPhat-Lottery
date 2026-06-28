package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.util.List;

@Builder
public record LotteryResultBoardDetailsResponse(
        @JsonView(Views.Public.class) List<LotteryResultLiveItemResponse> results
) {
}
