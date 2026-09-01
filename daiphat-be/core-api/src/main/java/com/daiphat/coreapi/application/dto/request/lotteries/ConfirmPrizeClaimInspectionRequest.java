package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import jakarta.validation.constraints.NotNull;

public record ConfirmPrizeClaimInspectionRequest(
        @NotNull(message = "Hình thức giao nộp là bắt buộc.")
        ReturnDeliveryMode deliveryMode
) {
}
