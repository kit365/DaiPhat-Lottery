package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.util.List;

@Builder
public record LotteryResultLiveItemResponse(
        @JsonView(Views.Public.class) LotteryResultResponse result,
        @JsonView(Views.Public.class) List<LotteryResultDetailResponse> details,
        @JsonView(Views.Public.class) String status,
        @JsonView(Views.Public.class) Integer pollAfterSeconds
) {
}
