package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ConfirmReturnInspectionRequest(
        @NotNull ReturnDeliveryMode deliveryMode,
        @NotEmpty List<Long> serialIds,
        String returnReceiptUrl
) {
}
