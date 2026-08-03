package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotNull;

public record CreateReturnBatchLineRequest(
        @NotNull Long lotteryStationId
) {
}
