package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateReturnBatchLineStatusRequest(
        @NotNull ReturnBatchLineStatus status
) {
}
